# Raspberry Pi set-up

The following is a quick listing of everything to do to set the showcase app
up to run well on a rasperry pi for one of the [Creative Coding Cabinets]. For
more general info, see the [README](README.md)

* Set hostname
* Set up wifi
* Make sure keyboard layout is correct.
* Set username / password.

## Set up ssh

```
ssh-keygen
ssh-copy-id -i ~/.ssh/id_rsa user@host
```

The change to the other machine and copy the keys back. You can 
then test the connection by ssh-ing back to the cabinet.

`ssh USER@CABINET_NAME.local`

## Configure git

```
git config --global pull.rebase false
git config --global user.email "your-email+cabinetname@example.com"
git config --global user.name "Your Name"
```

## Check out repository for creative coding showcase

```
mkdir ~/Documents/coding
cd ~/Documents/coding
git clone https://github.com/jareddonovan/creative-coding-showcase.git
```
## Set up github commandline utility.

* <https://github.com/cli/cli/blob/trunk/docs/install_linux.md>

```
gh auth login
```

### Set up desktop appearance

* Set monitor resolution to 1440x900
* Select dark mode.
* Task bar at bottom
* Solid color for background
* Darker shade of same color for window bar
* Lighter shade of same color for taskbar
* Remove waste basket and drives from desktop
* Set font size of terminal and desktop to 14pt
* Set mouse size to medium
* Set icon size to maximum
* In raspi configuration
  * (? Untick the option that checks about executable scripts)
    (? This may have applied to an earlier version of the OS?)
  * Untick the option for screen blanking
* in `~.config/wf-panel-pi.ini` add a line to the end `autohide=true`
  to automatically hide the task bar.
* In 'File Manager', open preferences, Edit > Preferences > General
  * [x] Open files with a single click.
  * [x] Don't ask options on launch executable file
  * Then select > Preferences > Display and set size of big icons to
    128x128


## Set up arcadeBonnet

For the Raspberry Pi 5, you'll also need to replace the GPIO library
with a drop-in that's compatible.

```
sudo apt autoremove python3-rpi.gpio
sudo apt install python3-rpi-lgpio
```

I have included a local copy of the script from AdaFruit, which has
the key assignents already edited for what the showcase app expects,
and has a minor fix for installing on the raspberry pi 5.

NOTE: If you're not on a raspberry pi 5, review (lines 114-117) or use
the AdaFruit script linked below.

```
cd scripts
sudo bash arcade-bonnet.sh
```

Alternatively, check the installation instructions here:

* <https://learn.adafruit.com/adafruit-arcade-bonnet-for-raspberry-pi/software>

I choose 'N' to both questions, then reboot.

## Test buttons and sound

The following p5js sketch collection allows you to test that the buttons and
sound are working. It can be handy to bookmark this in the raspberry pi browser.

<https://editor.p5js.org/creativecoding/collections/idDLXfg-F>

* For the sound, set the volume to about 75%. If it is all the way up,
  the sound will drop out.

## Copy over sketches you want to show

Assuming that you already have the folder of sketches and the `_links.json`
file prepared somewhere on your network, you can copy these over to the
cabinet.

```
# Make a directory on the cabinet to hold the sketches
mkdir ~/Documents/creative-coding-showcase

# SSH to the host that has the sketches and cd to directory.
ssh user@host       
cd ~/Documents/creative-coding-showcase

# Copy the sketches back to the cabinet.
scp -r sketches user@cabinet:/home/user/Documents/creative-coding-showcase/sketches
```

## Install node and packages

```
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt-get install -y nodejs
cd ~/Documents/coding/creative-coding-showcase
npm install
```

# Test app and edit config

Start the application to generate the config file so you can edit it.

`npm start`
`nano ~/.config/creative-coding-showcase/config.json`

## Compile app and install

```
npm run make
cd out/make/deb/armv64/
sudo apt install creative-coding-....deb
```

## Set up keyboard shortcut

```
sudo apt install xbindkeys
nano ~/.xbindkeysrc
```

Add the following

```
"creative-coding-showcase"
control+alt+1
"killall creative-coding"
control+alt+3
```

And bind the keys (this probably needs to be done automatically at startup)

```
xbindkeys
```

After that you should be able to press CTR+ALT+1 to launch the showcase and
CTRL+ALT+3 to kill it.

## Get rid of the mouse cursor if necessary

```
sudo apt install unclutter
sudo nano /etc/xdg/lxsession/LXDE-pi/autostart
```

and add the following line to the end: `@unclutter -idle 10`

## Set up shortcuts

`cp scripts/cc-showcase.desktop` to `~/Desktop/cc-showcase.desktop`

If you want it to start automatically also do this:

`cp scripts/autostart.desktop` to `/etc/xdg/autostart/autostart.desktop`

## Add startup image

```
sudo cp images/splash.png /usr/share/plymouth/themes/pix/splash.png
```

[Creative Coding Cabinets]: https://github.com/jareddonovan/creative-coding-cabinets
