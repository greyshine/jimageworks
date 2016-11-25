# jimageworks

Jquery Plugin for basic image modifications usings html5 canvas.

* rotate 90° to the right
* rotate 90° to the left (I call it _lotate_)
* Flip horizontal (actually a rotation by 180°)
* Mirror / Flip vertical (mirror on the vertical axis)
* Align - draw a line in order to mark the horizontal line of the image, rotation of the image will then be applied to the proper angle
* Crop - draw a box to tell which part of the image should be cropped.

Aligning and cropping implies to make mouse clicks in order to work.

## Goal
From the users point of view is the goal to simple have a &lt;img src="" /&lt; which allows transformations without having to specify css attributes.
In other words the src of the image is always what you see.

## How it works

For example rotating an image will follow these steps:

* exchange the image to be a canvas.
* rotate the image on the canvas
* store the canvas image data back to be the image's src
* exchange the canvas with image.

Same applies to the other functionalities

## Why ?

... in order to have instant image edit possibilities on the page without communication to a backend server and then being able to communicate that edited image 1:1 to whoever needs it by getting the src property.

What for? - This is up to you. I do have my intention to do it exactly that way.

## What to come?

Probably I will make cropping and aligning free of having to draw a line or a box. Entering the coordinates or for example simply rotating the image will do a good job as well. 

