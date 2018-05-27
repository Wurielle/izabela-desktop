# Izabela
A proof of concept text-to-speech application allowing global typing. Can be used over applications such as voice chats, games and much more.

<img src="https://i.imgur.com/wcL8u1v.gif?raw=true" width="100%">

## Known Bugs & Hotfixes
* If the app is suddenly not working correctly, try deleting `user-settings.json` in `C:\Users\YourName\AppData\Roaming\Izabela` and restart Izabela.

## What is it and why does it exist
Izabela is a text-to-speech application for Windows. You can select a language, change pitch or rate (just like a regular text-to-speech application on the web you could say) but here's the kicker: **It's not in a browser.**

### Why does it matter?

Using [Electron](https://electron.atom.io), Izabela brings the best of both worlds:
* An easy to use text-to-speech web api
* Global Windows Shortcuts

By combining this with softwares like [Virtual Audio Cables](http://www.vb-audio.com/Cable/index.htm#DownloadCable), you can communicate through voice chat applications while the app is focused **[or not](https://github.com/Wurielle/izabela-desktop#global-mode)**!

### Why does it exist?

Originally I wanted to find a way to communicate with people in games and voice chats without having to use my voice.

As I developed Izabela I found out that it could potentially not only help me but also help people trying to improve their pronunciation in multiple languages and even help mute people (or people having trouble speaking) communicate through artificial voices.

That is why I decided to distribute this proof of concept to see where it could go and if it is indeed helpful to some of you out there!

## Requirements
Izabela works on its own if you just want to make it pronounce words or sentences. However it is much more useful when you want to communicate with it through a microphone.
For that task you'll need [Virtual Audio Cables](http://www.vb-audio.com/Cable/index.htm#DownloadCable) which is included in the **dependencies** folder in this repository. See the **[Installation](https://github.com/Wurielle/izabela-windows#installation)** section below for guidance.

## Installation
### [Izabela](https://github.com/Wurielle/izabela-windows/)
1. [Download](https://github.com/Wurielle/izabela-windows/releases/latest) the .exe file (Izabela-Setup-x.y.z.exe)
2. Launch the .exe, let it install and that's it!

### [Virtual Audio Cables](http://www.vb-audio.com/Cable/index.htm#DownloadCable)
Virtual Audio Cables allows you to create a virtual audio cable that links an audio output to an audio input.

1. Use the version inside the **dependencies** folder in this repository or [download](http://www.vb-audio.com/Cable/index.htm#DownloadCable) the latest version on [vb-audio.com](http://www.vb-audio.com).
2. Unzip the zip file and execute VBCABLE_Setup **(32bits)** or VBCABLE_Setup_x64 **(64bits)** **as administrator.** A window should appear and ask you to install the virtual cable, follow the instructions.
3. Once installed you should see the virtual cable by going into **Control Panel > Hardware and Sound > Sound** and it should appear in both the **Playback** and **Recording** tabs. If not, restart your PC or make sure you correctly installed the virtual audio cable.

![alt text](https://i.imgur.com/R7l4YRE.png)

![alt text](https://i.imgur.com/UKWzqiq.png)

## How to use
When launching Izabela you should see something like a **blue pulse** in the center. That means the app is focused. You can then type words and press `Enter` to make Izabela speak.

![alt text](https://i.imgur.com/UEthOum.png)

### Sentence mode & Word mode
You can choose between Sentence mode and Word mode in the parameters. You can also switch modes by pressing `Tab` when the app is focused or `Ctrl`+`Tab` when the app is in [Global mode](https://github.com/Wurielle/izabela-desktop#global-mode). You can access parameters by clicking the "settings" icon on the top left corner of the app.
* **Sentence mode**: Waits until you press `Enter` to send the last queued sentence.
* **Word mode**: Sends the last queued word everytime your press `Space` or `Enter`.

### Global mode
You can access Global mode by pressing `Alt+Enter` and leave it by pressing `Alt+Enter`  again.
Global mode allows you to type words or sentences even if the app is not focused (in a game for instance).

![alt text](https://i.imgur.com/gSrFTcG.jpg)
> NOTE:
> Global mode uses letters from [A-Z] and numbers between [0-9]. It does **NOT** support punctuation yet!
> It also disables those keys in the application you are using so make sure to leave the global mode when you are done.

> If you want to use global mode in games, set your games display to `Windowed`, `Borderless` or `Borderless Fullscreen`.

> Be sure to set your keyboard type in the options. `QWERTY` is the default keyboard type.

>![alt text](https://i.imgur.com/nqWYjcy.png)
### Routing Izabela to your microphone
Once you completed the [installation](https://github.com/Wurielle/izabela-windows#installation):
1. Open the option panel in Izabela.
2. Select CABLE Input as Audio Output.
3. And that's it!

![alt text](https://i.imgur.com/Uxq12fA.png)

Now any time Izabela speaks, it will send audio to CABLE Output. You can now configure your voice chat to use CABLE Output as microphone!

![alt text](http://i.imgur.com/vdUH5F2.png)

> NOTE: You can have up to 5 audio outputs.
