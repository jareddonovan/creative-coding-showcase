# DEV NOTES

## Testing that camera works on pi

I have the raspberry pi camera module 3, wide.

To test that the camera is working on the pi (but not necessarily in the
browser), use: `libcamera-hello`. This will open a window with a feed of the
camera. It will close after a few seconds. You an also use `rpicam-vid`, which
does much the same thing.

The camera module appears to be working fine based on this.

## Getting raspberry pi camera module working as a webcam on chromium.

Sketch for testing webcam in the browser:

* <https://editor.p5js.org/creativecoding/sketches/bBltPXx2A>

Support for it is added to firefox and the sketch above works fine. 

Chromium does not. I haven't been able to find whether there's an open issue or
bug tracking this yet, but will look into it. It may be related to one or more
of these keywords: 

* bcm2835-v412 - the kernel module for the camera module?
* CSI cameras - generic name for the cameras?
* pipewire - a low level multimedia framework for linux.


## GStreamer workaround

A work around was the use of `gstreamer` mentioned on the following page. The
reply is about half way down from user **MattO**. They mention that a
limitation is that chromium doesn't have access to the camera controls, but
otherwise, works fine:

* <https://forums.raspberrypi.com/viewtopic.php?t=359204>

That appears to have worked for me too. I followed the following steps:

First install gstreamer and plugins, then the loopback

```
sudo apt-get install -y gstreamer1.0-tools gstreamer1.0-plugins gstreamer1.0-libcamera
sudo apt-get install -y v4l2loopback-dkms

```

Then create a conf file which activates the loopback modle on startup:

```
sudo nano /etc/modules-load.d/v4l2loopback.conf
```

The file contains the following

```
v4l2loopback
```

Then create a conf file for the virtual camera device:

```
sudo nano /etc/modprobe.d/v4l2loopback.conf
```

With the following content. They mention that `video_nr` should not collide
with any video devices present. Check this with `ls /dev/`.

```
options v4l2loopback video_nr=10
options v4l2loopback card_label="Chromium device"
options v4l2loopback exclusive_caps=1
```

After reboot, the camera loopback can be launched with the following command.
Make sure `device` matches `video_nr` from above:

```
gst-launch-1.0 libcamerasrc ! "video/x-raw,width=1280,height=1080,format=YUY2",interlace-mode=progressive ! videoconvert ! v4l2sink device=/dev/video10

```

I added that line to a script, which I created in the scripts folder called
`launch_video_loopback.sh`. I then added the script to the crontab.

```
sudo crontab -e
```

With the following line:

```
@reboot /home/USER/Documents/coding/creative-coding-showcase/scripts/launch_video_loopback.sh
```



## Troubleshooting SD cards notes

* H1: Huey - in the spare rpi 4. Haven't tested.
* H2: Huey - in the cabinet rpi 5. Works.
* H3: Huey - in the cabinet - spare. Haven't tested.

* D1: Dewey - in the spare rpi 4. Haven't tested.
* D2: Dewey - in the cabinet - spare. Haven't tested.
* D3: Dewey - in the cabinet rpi 5. Works.

* L1: Louie - in the spare pi4. Haven't tested.
* L2: Louie - not working.
* L3: Louie - in the cabinet rpi5. Works.

## Raspberry pi 5 power button fix notes

On the raspberry pi 5, there is a power button which should allow the user to
press once to bring up a shutdown dialog, twice to initiate shutdown, or
long-press to do a hard power off.

However, when I install the arcadeBonnet.py scripts, this stops working. Also, 
if I try to enable the GPIO-halt utility, that also does not work. There appear
to be several issues. I have filed the following issues for this:

* <https://github.com/adafruit/Raspberry-Pi-Installer-Scripts/issues/314>
* <https://github.com/adafruit/Adafruit-GPIO-Halt/issues/3>

This previous issue on getting the arcade bonnet script working is also
relevant:

* <https://github.com/adafruit/Raspberry-Pi-Installer-Scripts/issues/313>

### Problems with gpio-halt not installing

The arcade bonnet script separately installs the gpio-halt utility, so I decided
to first try and compile that and get it running. 

```
git clone https://github.com/adafruit/Adafruit-GPIO-Halt
cd Adafruit-GPIO-Halt
make
```

Results in the following compile error.

```
gpio-halt.c:63:10: fatal error: bcm_host.h: No such file or directory
    63 | #include <bcm_host.h>
       |          ^~~~~~~~~~~~
```

BCM host needs to be installed with the following headers as per this
[forum post](https://raspberrypi.stackexchange.com/questions/36121/fatal-error-bcm-host-h-no-such-file-or-directory-compilation-terminated).

```
sudo apt-get install libraspberrypi-dev raspberrypi-kernel-headers
```

After this, it will compile but will fail with the following error when you
try to run it. I also added some extra error reporting code to see the error
number:

```
make
sudo make install
sudo gpio-halt
> gpio-halt: Can't mmap().  Try 'sudo gpio-halt'.
>   errno: Invalid argument
```

The error is arising from line 202 in `gpio-halt.c` where it calls to 
`[mmap()]`. `mmap()` is a
function in the standard C library that creates a memory mapping in the virtual
address space. 

I did a bit more debugging on this by printing out the actual values that were 
being passed to `mmap()`, but I couldn't see anything obviously wrong. From 
what I could see this will probably take some more research to find out what is 
going wrong. I decided a simpler tack would be to either:

* a) figure out why the `arcadeBonnet.py` script might be interfering with the 
  in-built pi5 power button, 
* b) or alternatively see if there's a way to trigger a shutdown in python from
  the `arcadeBonnet.py` script directly.
  
If neither of these work, I will take a look at the `retrogame` project and see
if it has any issues related to working on raspberry pi 5. Or perhaps there is
another library that will work on rapsberry pi 5.

### Troubleshooting arcadeBonnet.py script

As per the [Raspberry Pi Hardware] documentation, you can add your own power
button. I have done this and tested it. It works just like the on-board button.

My plan is to step through installing the `arcadeBonnet.py` script and see if
I can figure out where the power button stops working. 

As a starting point, I used `evtest` to see how gpio pins are connected. Someone
online suggested that this is a useful tool for debugging gpio problems. 

```
apt install evtest
sudo evtest --grab
```

It returns the following:

```
No device specified, trying to scan all of /dev/input/event*
Available devices:
/dev/input/event0:	pwr_button
/dev/input/event1:	vc4-hdmi-0
/dev/input/event2:	vc4-hdmi-0 HDMI Jack
/dev/input/event3:	vc4-hdmi-1
/dev/input/event4:	vc4-hdmi-1 HDMI Jack
/dev/input/event5:	  RPI Wired Keyboard 4
/dev/input/event6:	  RPI Wired Keyboard 4
/dev/input/event7:	PixArt USB Optical Mouse
Select the device event number [0-7]: 
```

I enter `0` and get the following additional information about the pwr_button:

```
Input driver version is 1.0.1
Input device ID: bus 0x19 vendor 0x1 product 0x1 version 0x100
Input device name: "pwr_button"
Supported events:
  Event type 0 (EV_SYN)
  Event type 1 (EV_KEY)
    Event code 116 (KEY_POWER)
Properties:
Testing ... (interrupt to exit)
```

If you press the power button at this point, it generates the following output:

```
Event: time 1716693434.316437, type 1 (EV_KEY), code 116 (KEY_POWER), value 1
Event: time 1716693434.316437, -------------- SYN_REPORT ------------
Event: time 1716693434.451525, type 1 (EV_KEY), code 116 (KEY_POWER), value 0
Event: time 1716693434.451525, -------------- SYN_REPORT ------------
```

It will be interesting to see if that gets triggered by the arcade bonent 
events too. 

I also used the command `sudo cat /sys/kernel/debug/gpio` to list all the 
controllers registered through this framework, and the state of the GPIOs 
currently in use. I note that the left collumn uses a different numbering from 
the GPIO pins we can physically see on the board. hat the exposed GPIO pins are 
listed from `gpio-572` to `gpio-598`.

The most relevant line for the power button appears to be:

```
gpio-532 (PWR_GPIO            |pwr_button          ) in  hi ACTIVE LOW
```

Full output is:

```
gpiochip0: GPIOs 512-543, parent: platform/107d508500.gpio, gpio-brcmstb@107d508500:
 gpio-512 (-                   )
 gpio-513 (2712_BOOT_CS_N      |spi10 CS0           ) out hi ACTIVE LOW
 gpio-514 (2712_BOOT_MISO      )
 gpio-515 (2712_BOOT_MOSI      )
 gpio-516 (2712_BOOT_SCLK      )
 gpio-517 (-                   )
 gpio-518 (-                   )
 gpio-519 (-                   )
 gpio-520 (-                   )
 gpio-521 (-                   )
 gpio-522 (-                   )
 gpio-523 (-                   )
 gpio-524 (-                   )
 gpio-525 (-                   )
 gpio-526 (PCIE_SDA            )
 gpio-527 (PCIE_SCL            )
 gpio-528 (-                   )
 gpio-529 (-                   )
 gpio-530 (-                   )
 gpio-531 (-                   )
 gpio-532 (PWR_GPIO            |pwr_button          ) in  hi ACTIVE LOW
 gpio-533 (2712_G21_FS         )
 gpio-534 (-                   )
 gpio-535 (-                   )
 gpio-536 (BT_RTS              )
 gpio-537 (BT_CTS              )
 gpio-538 (BT_TXD              )
 gpio-539 (BT_RXD              )
 gpio-540 (WL_ON               |wl_on_reg           ) out hi 
 gpio-541 (BT_ON               |shutdown            ) out hi 
 gpio-542 (WIFI_SDIO_CLK       )
 gpio-543 (WIFI_SDIO_CMD       )

gpiochip1: GPIOs 544-547, parent: platform/107d508500.gpio, gpio-brcmstb@107d508520:
 gpio-544 (WIFI_SDIO_D0        )
 gpio-545 (WIFI_SDIO_D1        )
 gpio-546 (WIFI_SDIO_D2        )
 gpio-547 (WIFI_SDIO_D3        )

gpiochip2: GPIOs 548-564, parent: platform/107d517c00.gpio, gpio-brcmstb@107d517c00:
 gpio-548 (RP1_SDA             )
 gpio-549 (RP1_SCL             )
 gpio-550 (RP1_RUN             |RP1 RUN pin         ) out hi 
 gpio-551 (SD_IOVDD_SEL        |vdd-sd-io           ) out hi 
 gpio-552 (SD_PWR_ON           |sd_vcc_reg          ) out hi 
 gpio-553 (SD_CDET_N           |cd                  ) in  lo ACTIVE LOW
 gpio-554 (SD_FLG_N            )
 gpio-555 (-                   )
 gpio-556 (2712_WAKE           )
 gpio-557 (2712_STAT_LED       |ACT                 ) out hi ACTIVE LOW
 gpio-558 (-                   )
 gpio-559 (-                   )
 gpio-560 (PMIC_INT            )
 gpio-561 (UART_TX_FS          )
 gpio-562 (UART_RX_FS          )
 gpio-563 (-                   )
 gpio-564 (-                   )

gpiochip3: GPIOs 565-570, parent: platform/107d517c00.gpio, gpio-brcmstb@107d517c20:
 gpio-565 (HDMI0_SCL           )
 gpio-566 (HDMI0_SDA           )
 gpio-567 (HDMI1_SCL           )
 gpio-568 (HDMI1_SDA           )
 gpio-569 (PMIC_SCL            )
 gpio-570 (PMIC_SDA            )

gpiochip4: GPIOs 571-624, parent: platform/1f000d0000.gpio, pinctrl-rp1:
 gpio-571 (ID_SDA              )
 gpio-572 (ID_SCL              )
 gpio-573 (GPIO2               )
 gpio-574 (GPIO3               )
 gpio-575 (GPIO4               )
 gpio-576 (GPIO5               )
 gpio-577 (GPIO6               )
 gpio-578 (GPIO7               )
 gpio-579 (GPIO8               )
 gpio-580 (GPIO9               )
 gpio-581 (GPIO10              )
 gpio-582 (GPIO11              )
 gpio-583 (GPIO12              )
 gpio-584 (GPIO13              )
 gpio-585 (GPIO14              )
 gpio-586 (GPIO15              )
 gpio-587 (GPIO16              )
 gpio-588 (GPIO17              )
 gpio-589 (GPIO18              )
 gpio-590 (GPIO19              )
 gpio-591 (GPIO20              )
 gpio-592 (GPIO21              )
 gpio-593 (GPIO22              )
 gpio-594 (GPIO23              )
 gpio-595 (GPIO24              )
 gpio-596 (GPIO25              )
 gpio-597 (GPIO26              )
 gpio-598 (GPIO27              )
 gpio-599 (PCIE_RP1_WAKE       )
 gpio-600 (FAN_TACH            )
 gpio-601 (HOST_SDA            )
 gpio-602 (HOST_SCL            )
 gpio-603 (ETH_RST_N           |phy-reset           ) out hi ACTIVE LOW
 gpio-604 (-                   )
 gpio-605 (CD0_IO0_MICCLK      |cam0_reg            ) out lo 
 gpio-606 (CD0_IO0_MICDAT0     )
 gpio-607 (RP1_PCIE_CLKREQ_N   )
 gpio-608 (-                   )
 gpio-609 (CD0_SDA             )
 gpio-610 (CD0_SCL             )
 gpio-611 (CD1_SDA             )
 gpio-612 (CD1_SCL             )
 gpio-613 (USB_VBUS_EN         )
 gpio-614 (USB_OC_N            )
 gpio-615 (RP1_STAT_LED        |PWR                 ) out hi ACTIVE LOW
 gpio-616 (FAN_PWM             )
 gpio-617 (CD1_IO0_MICCLK      |cam1_reg            ) out lo 
 gpio-618 (2712_WAKE           )
 gpio-619 (CD1_IO1_MICDAT1     )
 gpio-620 (EN_MAX_USB_CUR      )
 gpio-621 (-                   )
 gpio-622 (-                   )
 gpio-623 (-                   )
 gpio-624 (-                   )
```
 
Below, I will install the arcade bonnet script and see what changes in these
outputs.
 
#### Installing arcade bonnet script. 
  
For the arcade bonnet script to work on raspberry pi 5, you need to replace
the `rpi.gpio` python library with `rpi-lgpio`.

```
sudo apt autoremove python3-rpi.gpio
sudo apt install python3-rpi-lgpio
```
  
In order to get the arcade bonnet script working on raspberry pi 5, you also
need to change the script around line 118, as follows:

```
echo "Installing Python libraries..."
apt-get install -y python3-pip
# For raspberry pi 4 or below uncomment the following.
# pip3 install evdev smbus
# For raspberry pi 5 (bookworm) use the following.
apt install python3-evdev
apt install python3-smbus
```

This is because the raspberry pi 5 **bookworm** OS, introduces a managed python
environment and any python modules should be installed with `apt install`.

I installed the above directly to test whether any of them interfere with the 
power button. They do not.

I run the arcade bonnet installation script with `sudo bash arcade-bonnet.sh`. 
I choose the following options:

* Disable overscan: N
* Install GPIO-halt: N
* Reboot now: N

At this point, the script has been installed, but may not be active until next
boot. The power button still works at this point.

I reboot.

The pi restarts and I test the power button. It works. I have not plugged in the
arcade bonnet hat yet. 

Running the `sudo cat /sys/kernel/debug/gpio` again produces identical output 
as previously. There is also no change from `sudo evtest --grab`. I would have 
expected it to change something to do with GPIO17, since that is where the 
arcadeBonnet.py script attaches to. Perhaps it's because the hardware isn't 
plugged in yet.

I shutdown, plug the bonnet in, and restart.



## Links

[`nmap()`]: https://man7.org/linux/man-pages/man2/mmap.2.html
[Raspberry Pi Hardware]: https://www.raspberrypi.com/documentation/computers/raspberry-pi.html

