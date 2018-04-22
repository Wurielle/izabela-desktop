# Izabela
A proof of concept text-to-speech application allowing global typing. Can be used over applications such as voice chats, games and much more.
![alt text](https://thumbs.gfycat.com/DazzlingVeneratedArmedcrab-size_restricted.gif)

## What is it and why it exists
Izabela is a text-to-speech application for Windows. You can select a language, change pitch or rate (just like a regular text-to-speech application on the web you could say) but here's the kicker: **It's not in a browser.**

### Why does it matter?

Using [Electron](https://electron.atom.io), Izabela brings the best of both worlds:
* An easy to use text-to-speech web api
* Global Windows Shortcuts

By combining this with softwares like [Virtual Audio Cables](http://www.vb-audio.com/Cable/index.htm#DownloadCable), you can communicate through voice chat applications while the app is focused **or not**!

### Why does it exist?

Originally I wanted to find a way to communicate with people in games and voice chats without having to use my voice.

As I developed Izabela I found out that it could potentially not only help me but also help people trying to improve their pronunciation in multiple languages and even help mute people (or people having trouble speaking) communicate through artificial voices.

That is why I decided to distribute this proof of concept to see where it could go and if it is indeed helpful to some of you out there!

## Roadmap & Requirements
Izabela works on its own if you just want to make it pronounce words or sentences. However it is much more useful when you want to communicate with it through a microphone.
For that task you'll need [Virtual Audio Cables](http://www.vb-audio.com/Cable/index.htm#DownloadCable) which is included in the **dependencies** folder. See the **[Installation](https://github.com/Wurielle/izabela-windows#installation)** section below for guidance.

My priority list currently includes:
* More apis integration
* User settings
* Audio queues
* Tray icon, logo & informations
* Shortcuts improvements (on [Electron](https://electron.atom.io))
* **And of course your feedback!**

## Installation
### [Izabela](https://github.com/Wurielle/izabela-windows/)
1. [Download](https://github.com/Wurielle/izabela-windows/releases/latest) the latest release (which includes a version of [Virtual Audio Cables](http://www.vb-audio.com/Cable/index.htm#DownloadCable))
2. Unzip the zip file somewhere on your PC
3. Launch Izabela.exe in builds/Izabela-win32-x64 (I recommend creating a shortcut for later use)

### [Virtual Audio Cables](http://www.vb-audio.com/Cable/index.htm#DownloadCable)
Virtual Audio Cables allows you to create a.. virtual audio cable that links an audio output to an audio input.

1. Use the version inside the **dependencies** folder or [download](http://www.vb-audio.com/Cable/index.htm#DownloadCable) the latest version on [vb-audio.com](http://www.vb-audio.com).
2. Unzip the zip file and execute VBCABLE_Setup **(32bits)** or VBCABLE_Setup_x64 **(64bits)** **as administrator.** A window should appear and ask you to install the virtual cable, follow the instructions.
3. Once installed you should see the virtual cable by going into **Control Panel > Hardware and Sound > Sound** and it should appear in both the **Playback** and **Recording** tabs. If not, restart your PC or make sure you correctly installed the virtual audio cable.

![alt text](http://i.imgur.com/rW7ijRl.png)
![alt text](http://i.imgur.com/B1yLkYu.png)

4. In the **Recording** tab, I recommend going in your CABLE Output settings and check **"listen to this peripheral"**.

![alt text](http://i.imgur.com/SbFBzbZ.png)

## How to use
When launching Izabela you should see something like a **blue pulse** in the center. That means the app is focused. You can then type words and press `Enter` to make Izabela speak.

![alt text](http://i.imgur.com/u272zCA.png)

### Sentence mode & Word mode
You can choose between Sentence mode and Word mode in the parameters. You can access parameters by clicking the gear on the top right corner of the app.
* **Sentence mode**: Waits until you press `Enter` to send the last queued sentence.
* **Word mode**: Sends the last queued word everytime your press `Space` or `Enter`.

### Global mode
You can access Global mode by pressing `Alt+Enter` and leave it by pressing `Alt+Enter`  again.
Global mode allows you to type words or sentences even if the app is not focused (in a game for instance).
> NOTE:
> Global mode uses letters from [A-Z] and numbers between [0-9]. It does **NOT** support punctuation yet!
> It also disables those keys in the application you are using so make sure to leave the global mode when you are done.

### Routing Izabela to your microphone
Once you completed the [installation](https://github.com/Wurielle/izabela-windows#installation):
1. Open the option panel in Izabela
2. Select CABLE Input as Audio Output
3. And that's it!

Now any time Izabela speaks, it will send audio to CABLE Output. You can now configure your voice chat to use CABLE Output as microphone!

![alt text](http://i.imgur.com/vdUH5F2.png)

(Discord as example)
