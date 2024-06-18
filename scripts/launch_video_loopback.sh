# Launches virtual webcam device loopback, so chromium can access pi camera
# module. See this post: https://forums.raspberrypi.com/viewtopic.php?t=359204
#!/bin/bash
gst-launch-1.0 \
  libcamerasrc ! "video/x-raw,width=1280,height=1080,format=YUY2", \
  interlace-mode=progressive ! videoconvert ! v4l2sink device=/dev/video10
