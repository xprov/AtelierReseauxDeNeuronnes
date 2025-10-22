#!/usr/bin/env python3

import asyncio
import json
import websockets
import subprocess
import platform
import threading
import webbrowser
from pathlib import Path



from threading import Thread

ADDRESS = 'localhost'
PORT    = '8081'

TMPFOLDER  = "./tmp/"
STOPFILE   = TMPFOLDER + 'myStopFile'
OUTPUTFILE = TMPFOLDER + 'progression'
EXPORTFILE = TMPFOLDER + 'export.nn'
NNASJSFILE = TMPFOLDER + 'export.js'
CONFIGFILE = TMPFOLDER + 'config.txt'



TRAINBPNISRUNNING = False
MYTHREAD = None

WEBSOCKET = None


MESSAGES = {
        'initialization': {'category' : 'initialization'},
        'progress': {'category' : 'progress', 'epoch' : None, 'accuracy' : None, 'mse' : None}, 
        'completed': {'category' : 'completed'},
        }



def launchTrainBPN():
    global TRAINBPNISRUNNING
    TRAINBPNISRUNNING =  True
    system = platform.system()
    if system == 'Windows':
        executable = "bin/trainBPN.exe"
    elif system == 'Linux':
        executable = "bin/trainBPN_linux"
    elif system == 'Darwin':
        executable = "bin/trainBPN_mac"
    else:
        print('[launchTrainBPN::error] : Unsupported OS ' + system)
        exit(34)
    cmd = f'{executable} {CONFIGFILE} > {OUTPUTFILE}'
    print(f'{cmd=}')
    o = subprocess.getoutput(cmd)
    print("---> " + o)
    try :
        print('Copying exported neural network into a JS file')
        fi = open(EXPORTFILE, 'r')
        fo = open(NNASJSFILE, 'w')
        s = 'document.getElementById("importBox").value = "'
        s += r'\n'.join(map(lambda x : x.replace('\n', ''), fi.readlines()))
        s += '";'
        fo.write(s)
        fi.close()
        fo.close()
    except Exception as e:
        print('[launchTrainBPN::error] : ' + str(e))
    TRAINBPNISRUNNING = False


async def progressWatcher():
    global TRAINBPNISRUNNING, WEBSOCKET
    await asyncio.sleep(0.5)
    print('progressWatcher has started')
    initialization = True
    while TRAINBPNISRUNNING:
        try:
            await asyncio.sleep(0.2)
            f = open(OUTPUTFILE, 'r')
            line = f.readlines()[-1].strip()
            f.close()
            print(line)
            if line.startswith("Epoch"):
                initialization = False
                epoch = line.split(' ')[1]
                accuracy = line.split(' ')[10].split(':')[1][:-1]
                mse = line.split(' ')[12]
                message = MESSAGES['progress'].copy()
                message['epoch'] = epoch
                message['accuracy'] = accuracy
                message['mse'] = mse
                print('  reading from `' + OUTPUTFILE + f'` -> {epoch=}, {accuracy=}, {mse=}')
                await WEBSOCKET.send(json.dumps(message))
            elif initialization:
                message = MESSAGES['initialization'].copy()
                await WEBSOCKET.send(json.dumps(message))
            else:
                pass
        except Exception as e:
            print('[progressWatcher::error] ' + str(e))
    print('progressWatcher has ended')




async def stopTrainBPN(notifyClient = True):
    global STOPFILE, MYTHREAD, WEBSOCKET
    f = open(STOPFILE, 'w')
    f.write('1')
    f.close()
    try:
        MYTHREAD.join()
    except:
        pass
    if notifyClient:
        await WEBSOCKET.send(json.dumps(MESSAGES['completed']))
    
async def resetTrainBPN():
    """
    Cette fonction eset appelé uniquement lorsque le client se connecte au serveur.

    L'idée est que si jamais l'utilisateur recharge la page web du client
    pendant que l'entraînement d'un réseau, alors on arête l'entraînement et on
    ignore le résultat.
    """
    await stopTrainBPN(notifyClient = False)

    
def buildConfigurationFile(data):
    default_config = {
            "export" : EXPORTFILE,
            "activation" : "Sigmoid(1)",
            "maxEpoch" : "-1",
            "accuracy" : "100.0",
            "stopFile" : STOPFILE,
            }
    myConfig = {**default_config, **data}
    print('Configuration : ' + str(myConfig))
    f = open(CONFIGFILE, 'w')
    f.write('\n'.join(f'{k} = {myConfig[k]}' for k in myConfig) + '\n')
    f.close()
    pass


async def listener(websocket):
    global WEBSOCKET, MYTHREAD
    WEBSOCKET = websocket
    print('Connextion par  ' + ADDRESS + ':' + PORT)
    await resetTrainBPN()
    async for message in WEBSOCKET:
        try:
            data = json.loads(message)
            print('Received : ' + str(data))
            if data['category'] == 'startTraining':
                if not TRAINBPNISRUNNING:
                    print('Initializing training')
                    print('  (1/4) building configuration file')
                    buildConfigurationFile(data)
                    print('  (2/4) creating progress watcher taks')
                    asyncio.create_task(progressWatcher())
                    print('  (3/4) creating launcher thread')
                    MYTHREAD = Thread(target=launchTrainBPN)
                    print('  (4/4) launching thread')
                    MYTHREAD.start()
                else:
                    print("Erreur : on demande de démarrer trainBPN alors qu'il est déjà en cours d'exécution.")
            elif data['category'] == 'stopTraining':
                if TRAINBPNISRUNNING:
                    print('Halting trainBPN')
                    await stopTrainBPN()
                    print('  done.')
                else:
                    print("Erreur : on demande d'arrêter trainBPN alors qu'il n'est pas en cours d'exécution.")
            else:
                print(f"Erreur : categorie de message `{data['category']}` inconnue.")

        except Exception as e:
            print('Erreur : ' + str(e))


async def server():
    print('Lancement du serveur')
    async with websockets.serve(listener, ADDRESS, PORT):
        await asyncio.Future()

def openWebpage(filename):
    fichier = Path(filename).resolve()
    if not fichier.exists():
        print("Fichier introuvable :", fichier)
        exit(-1)
    print('Ouverture de la page web : ' + fichier.as_uri())
    webbrowser.open(fichier.as_uri())

if __name__ == '__main__':
    # Vérification de la version de la bibliothèque websockets
    #print(websockets.__file__)
    websockets_version = websockets.__version__ if hasattr(websockets, "__version__") else "0"
    if int(websockets_version.split('.')[0]) < 10:
        print(f"Erreur : la version de la bibliothèque websockets installée est {websockets_version}. Veuillez installer la version 10 ou supérieure.")
        exit(55)

    # Création du dossier pour les fichiers temporaires
    temp_dir = Path(TMPFOLDER)
    temp_dir.mkdir(exist_ok=True)

    # Lancement du navigateur web
    thd = threading.Timer(1.0, openWebpage, args=('web/index.html',))
    thd.start()

    # Lancement du serveur
    asyncio.run(server())


