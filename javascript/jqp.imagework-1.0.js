/**
 * JQuery plugin for helping with simple image editing tasks such aas:
 * 
 * * Rotating (90° to the right)
 * * Lotating (90° to the left)
 * * Mirror (flip on the vertical axis)
 * * Flip (flip on the horizontal axis, actually rotation of 180°)
 * * Aligning (draw line between two points and then trigger the rotation )
 * * Cropping (draw box by two points and then trigger cropping )
 * 
 * Basically the image is replaced by a canvas including the image.
 * 
 * @param $ jQuery itself
 */
(function($) {

	var alignDefaults = {
		lineColor : '#000',
		canvasBackgroundColor : '#FFF',
		callbackAngleSelect : function(image, x1, y1, x2, y2, degrees) {
		},
		callbackPosition1 : function(image, x, y) {
		},
		callbackPosition2 : function(image, x1, y1, x2, y2, degrees) {
		},
		testCanvasId:null
	};

	var cropDefaults = {
		callbackPositionSearch : function(image, x1, y1, x2, y2) {
			//console.log('ps: '+ x1+'x'+y1 +' / '+x2+'x'+y2 );
		},
		callbackPosition1 : function(image, x, y) {
			//console.log('p1');
		},
		callbackPosition2 : function(image, x1, y1, x2, y2) {
			//console.log('p2');
		},
		callbackCropped : function(image, x1, y1, x2, y2) {
			//console.log('cropped');
		},
		testCanvasId:null
	};

	var getCoordinates = function(evt) {

		var $target = $(evt.target);

		var posX = $target.position().left, posY = $target.position().top;

		return {
			x : (evt.pageX - posX),
			y : (evt.pageY - posY),
			toString : function() {
				return this.x + "x" + this.y;
			}
		};
	};

	var drawLine = function(ctx, x1, y1, x2, y2, lineColor) {
		ctx.beginPath();
		ctx.moveTo(x1, y1);
		ctx.lineTo(x2, y2);
		ctx.strokeStyle = lineColor || '#000'
		ctx.stroke();
	};

	var drawImageOnCanvas = function(canvas) {
		
		canvas.width = canvas.image.width;
		canvas.height = canvas.image.height;
		canvas.ctx.clearRect(0, 0, canvas.width, canvas.height);
		canvas.ctx.drawImage(canvas.image, 0, 0);
	};

	var createCanvas = function(image) {
		var canvas = document.createElement('canvas');
		canvas.ctx = canvas.getContext('2d');
		canvas.image = image;
		image.canvas = canvas;
		drawImageOnCanvas(canvas);
		return canvas;
	};

	var drawBox = function(canvas, xy) {
		canvas.ctx.fillRect(xy.x - 3, xy.y - 3, 7, 7);
	};

	var undoCanvas = function(canvas) {

		var dataURL = canvas.toDataURL();

		$(canvas).replaceWith(canvas.image);

		canvas.mode = null;
		canvas.click1 = null;
		canvas.click2 = null;
		
		canvas.image.canvas = null; // help GC to perform
		canvas.image = null;

		return dataURL;
	};
	
	/**
	 * 
	 * 1|2
	 * -0-
	 * 3|4
	 * 
	 * base is at 0
	 */
	var getQuadrant = function(baseXy, xy) {
		
		var x = xy.x-baseXy.x;
		var y = xy.y-baseXy.y;
		
		if ( x > 0 && y > 0 ) { return 4; }
		if ( x > 0 && y < 0 ) { return 2; }
		if ( x < 0 && y > 0 ) { return 3; }
		if ( x < 0 && y < 0 ) { return 1; }
		
		return 0;
	};
	
	/**
	 * @return { topLeft:{x:,y:}, bottomRight:{x:,y:} }
	 */
	var orderSelectionPoints = function(xy1, xy2) {
		
		var q = getQuadrant( xy1, xy2 );
		var t1 = xy1; var t2 = xy2;
		
		switch( q ) {
		case 1: 
			xy1 = {	x: t2.x, y: t2.y };
			xy2 = { x: t1.x, y: t1.y };
			break;
		case 2:
			xy1 = {	x: t1.x, y: t2.y };
			xy2 = { x: t2.x, y: t1.y };
			break;
		case 3:
			xy1 = {x: t2.x, y: t1.y };
			xy2 = {x: t1.x, y: t2.y };
			break;
		case 0:
		case 4: 
			xy1 = {x: t1.x, y: t1.y };
			xy2 = {x: t2.x, y: t2.y };
			break;
		};
		
		var r = {
			topLeft: xy1,
			bottomRight: xy2,
			width: xy2.x-xy1.x,
			height: xy2.y-xy1.y,
			area: this.width * this.height,
			toString:function() { return 'area='+ this.area; }.bind(this)
		};
		
		return r;
	}

	$.fn.crop = function(inSettings) {

		var settings = Object.assign({}, cropDefaults, inSettings);
		
		/**
		 * @return size of the selected area
		 */
		var drawSelection = function( canvas, xy1, xy2 ) {
			
			var tlbr = orderSelectionPoints( xy1, xy2 );
			
			// sometimes ff errors that tlbr is undefined; I could not proove so. a previous
			// console.log(tlbr)
			// console.log(tlbr.getArea());
			// will log a proper object and NEVER tlbr is mentioned to be undefined in the console.out! - WTF
			if ( tlbr.area == 0 ) { return tlbr; }
			
			xy1 = tlbr.topLeft;
			xy2 = tlbr.bottomRight;
			
			var ctx = canvas.getContext('2d');
			
			ctx.globalAlpha = 0.4;
			ctx.fillRect(0, 0, canvas.width, xy1.y);
			ctx.fillRect(0, xy2.y, canvas.width, xy2.y);

			ctx.fillRect(0, xy1.y, xy1.x, xy2.y - xy1.y);
			ctx.fillRect(xy2.x, xy1.y, canvas.width-xy2.x , xy2.y - xy1.y);
			
			return tlbr;
		};
		
		/**
		 * only for testing purposes
		 */
		var drawCropped = function(testCanvas, canvas, xy1, xy2) {
			
			if ( testCanvas == null ) { return; }
			
			var tlbr = orderSelectionPoints( xy1, xy2 );
			var tc = testCanvas;
			var image = canvas.image;
			tc.width = tlbr.width;
			tc.height = tlbr.height;
			var ctx = tc.getContext('2d');
			
			try {
				ctx.drawImage(image, tlbr.topLeft.x, tlbr.topLeft.y, tlbr.width , tlbr.height ,0 , 0, tlbr.width , tlbr.height );	
			} catch(e) {
				//swallow
			}
		};

		for (var i = 0, l = this.length; i < l; i++) {

			var image = this[i];
			var $image = $(image);

			if ('IMG' != $image.prop('tagName')) {
				continue;
			} 

			if ( image.canvas != null && image.canvas.click2 != null ) {
				
				// apply cropping to image
				
				var tlbr = orderSelectionPoints( image.canvas.click1, image.canvas.click2 );
				
				image.canvas.width = tlbr.width; 
				image.canvas.height = tlbr.height;
				
				image.canvas.ctx.clearRect( 0,0,image.canvas.width, image.canvas.height );
				
				image.canvas.ctx.drawImage(image, tlbr.topLeft.x, tlbr.topLeft.y, tlbr.width , tlbr.height ,0 , 0, tlbr.width , tlbr.height );
				
				image.src = image.canvas.toDataURL();

				settings.callbackCropped(image, image.canvas.click1.x, image.canvas.click1.y, image.canvas.click2.x, image.canvas.click2.y );
				
				undoCanvas( image.canvas );
				
				continue;
			
			} else if (image.canvas ) {

				undoCanvas(image.canvas);
				continue;
			} 

			image.canvas = createCanvas(image);
			image.canvas.mode = 'crop';
			image.canvas.click1 = null;
			image.canvas.click2 = null;

			image.canvas.onmousemove = function(evt) {

				if (this.click1 == null || this.click2 != null) {
					return true;
				}

				var xy = getCoordinates(evt);

				drawImageOnCanvas(this);
				
				drawSelection( this, this.click1, xy );

				drawBox(this, this.click1);
				drawBox(this, xy);
				
				if ( settings.testCanvasId != null ) {
					drawCropped( document.getElementById(settings.testCanvasId) ,this, this.click1, xy ) ;
				}
				
				settings.callbackPositionSearch( this.image, this.click1.x, this.click1.y, xy.x, xy.y );

			}.bind(image.canvas);

			image.canvas.onclick = function(evt) {

				if (this.click1 == null) {

					this.click1 = getCoordinates(evt);
					drawBox(this, this.click1);
					settings.callbackPosition1(this.image, this.click1.x, this.click1.y);

				} else if (this.click2 == null) {

					this.click2 = getCoordinates(evt);

					drawImageOnCanvas(this);
					
					var tlbr = drawSelection( this, this.click1, this.click2 );
					this.click1 = tlbr.topLeft;
					this.click2 = tlbr.bottomRight;
					
					settings.callbackPosition2(this.image, this.click1.x, this.click1.y, this.click2.x, this.click2.y);
				
				} else {
					
					this.click1 = null;
					this.click2 = null;
					drawImageOnCanvas(this);
				}
				
				return false; // no more propagation

			}.bind(image.canvas);

			$image.replaceWith(image.canvas);
		}

		return this;
	};

	$.fn.align = function(inSettings) {

		var settings = Object.assign({}, alignDefaults, inSettings);

		var calculateOuterBox = function(w, h, rotation) {

			while (rotation >= 360) {
				rotation -= 360;
			}
			while (rotation < 0) {
				rotation += 360;
			}

			if (rotation == 0 || rotation == 180) {
				return;
			}
			if (rotation == 90 || rotation == 270) {
				var t = canvas.width;
				canvas.width = canvas.height;
				canvas.height = t;
				return;
			}

			var beta = rotation;
			var alpha = 90 - beta;

			var c1 = w, c2 = h;

			var a1 = c1 * Math.cos(beta);
			var b1 = Math.sqrt((c1 * c1) - (a1 * a1));

			var a2 = c2 * Math.cos(beta);
			var b2 = Math.sqrt((c2 * c2) - (a2 * a2));

			var w2 = a2 + b1;
			var h2 = a1 + b2;

			return {
				x : w2,
				y : h2,
				toString:function() { return this.x+'x'+this.y; }
			};
		};

		var calculateRotation = function(xy1, xy2) {

			var a = xy1.y - xy2.y;
			var b = xy1.x - xy2.x;

			if (b === 0) {
				return 90;
			}// x-axis no offset }
			if (a === 0) {
				return 0;
			}// y-axis full }

			var c = Math.sqrt((a * a) + (b * b));
			var sin_alpha = a / c; // gegenkathete / ankathete
			var alpha = Math.asin(sin_alpha) * (180 / Math.PI);
			
			var q = getQuadrant( xy1, xy2 );
			
			if ( q == 1 || q == 3 ) {
				alpha *= -1;
			}

			return alpha;
		};

		var drawRotated = function(testCanvas, canvas, rotation) {

			if ( testCanvas == null ) { return; }
			
			var tc = testCanvas;

			var image = canvas.image;
			var w = image.width;
			var h = image.height;

			tc.width = Math.sqrt((w * w) + (h * h));
			tc.height = tc.width;
			
			var dim = calculateOuterBox( w,h, rotation );
			
			try {
				tc.width = dim.x;
				tc.height = dim.y;
				
			} catch (e) {
				// swallow
			}
			
			var ctx = tc.getContext('2d');
			ctx.save();
			ctx.clearRect(0, 0, tc.width, tc.height);
			ctx.translate(tc.width / 2, tc.height / 2);
			ctx.rotate(rotation * Math.PI / 180);
			ctx.drawImage(image, -image.width / 2, -image.height / 2);
			ctx.restore();
		};

		for (var i = 0, l = this.length; i < l; i++) {

			var image = this[i];
			var $image = $(image);

			if ('IMG' != $image.prop('tagName')) {
				continue;
			} else if (image.canvas != null && image.canvas.mode != null
					&& image.canvas.mode != 'align') {
				throw 'currently in mode: ' + image.canvas.mode;
			}

			var isAlignCall1 = image.canvas == null;

			// turn of align modus

			if (!isAlignCall1 && image.canvas.click2 == null) {

				undoCanvas(image.canvas);
				continue;

			} else if (!isAlignCall1 && image.canvas.click2 != null) {

				var rotation = calculateRotation(image.canvas.click1,
						image.canvas.click2);

				if (rotation == 0) {
					continue;
				}

				var canvas = image.canvas;
				var ctx = canvas.ctx;

				var cdim = calculateOuterBox(canvas.width, canvas.height,
						rotation);
				
				canvas.width = cdim.x;
				canvas.height = cdim.y;

				ctx.clearRect(0, 0, canvas.width, canvas.height);
				ctx.fillStyle = settings.canvasBackgroundColor;
				ctx.fillRect(0, 0, tc.width, tc.height);

				ctx.save();
				ctx.translate(canvas.width / 2, canvas.height / 2);
				ctx.rotate(rotation * Math.PI / 180);
				ctx.drawImage(image, -image.width / 2, -image.height / 2);
				ctx.restore();

				image.src = image.canvas.toDataURL();

				undoCanvas(image.canvas);

				continue;
			}

			var canvas = createCanvas(image);
			canvas.mode = 'align';
			canvas.click1 = null;
			canvas.click2 = null;

			canvas.onmousemove = function(evt) {

				if (this.click1 == null || this.click2 != null) {
					return true;
				}

				var xy = getCoordinates(evt);

				var deg = calculateRotation(this.click1, xy);

				drawImageOnCanvas(this);
				
				drawLine(this.ctx, this.click1.x, this.click1.y, xy.x, xy.y, settings.lineColor);
				drawBox(this, this.click1);
				drawBox(this, xy);

				settings.callbackAngleSelect(this.image, this.click1.x, this.click1.y, xy.x, xy.y, deg);
				
				if ( settings.testCanvasId != null ) {
					drawRotated(document.getElementById(settings.testCanvasId), this, deg);	
				}

			}.bind(canvas);

			canvas.onclick = function(evt) {

				// this is a canvas

				if (this.click2 != null) {

					this.click1 = null;
					this.click2 = null;
					drawImageOnCanvas(this);

				} else if (this.click1 == null) {

					this.click1 = getCoordinates(evt);
					drawBox(this, this.click1);
					settings.callbackPosition1(this.image, this.click1.x, this.click1.y);

				} else {

					this.click2 = getCoordinates(evt);
					var degrees = calculateRotation(this.click1, this.click2);

					drawLine(this.ctx, this.click1.x, this.click1.y,
							this.click2.x, this.click2.y, settings.lineColor);
					drawBox(this, this.click1);
					drawBox(this, this.click2);

					settings.callbackPosition2(this.image, this.click1.x, this.click1.y, this.click2.x, this.click2.y, degrees);
				}

				// no more propagation
				return false;

			}.bind(canvas);

			$image.replaceWith(canvas);
		}

		return this;
	};

	$.fn.getBase64 = function() {

		var canvas = document.createElement("canvas");

		var image = this[0];
		var $image = $(image);

		if ('IMG' != $image.prop('tagName')) {
			return null;
		}

		canvas.width = image.width;
		canvas.height = image.height;

		var ctx = canvas.getContext('2d');
		ctx.drawImage(image, 0, 0);

		return canvas.toDataURL();
	};

	$.fn.flip = function() {

		var canvas = document.createElement("canvas");
		var ctx = canvas.getContext('2d');

		for (var i = 0, l = this.length; i < l; i++) {

			var image = this[i];
			var $image = $(image);

			if ('IMG' != $image.prop('tagName')) {
				continue;
			}

			canvas.width = image.width;
			canvas.height = image.height;

			ctx.translate(0, image.height);
			ctx.scale(1, -1);
			ctx.drawImage(image, 0, 0);

			image.src = canvas.toDataURL();
		}

		return this;
	};

	$.fn.mirror = function() {

		var canvas = document.createElement("canvas");
		var ctx = canvas.getContext('2d');

		for (var i = 0, l = this.length; i < l; i++) {

			var image = this[i];
			var $image = $(image);

			if ('IMG' != $image.prop('tagName')) {
				continue;
			}

			canvas.width = image.width;
			canvas.height = image.height;

			ctx.translate(image.width, 0);
			ctx.scale(-1, 1);
			ctx.drawImage(image, 0, 0);

			image.src = canvas.toDataURL();
		}

		return this;
	};

	$.fn.rotate = function() {

		var canvas = document.createElement("canvas");
		var ctx = canvas.getContext('2d');

		for (var i = 0, l = this.length; i < l; i++) {

			var image = this[i];
			var $image = $(image);

			if ('IMG' != $image.prop('tagName')) {
				continue;
			}

			ctx.clearRect(0, 0, canvas.width, canvas.height);

			canvas.width = image.height;
			canvas.height = image.width;

			ctx.translate(canvas.width / 2, canvas.height / 2);
			ctx.rotate(Math.PI / 2);

			ctx.drawImage(image, -image.width / 2, -image.height / 2);

			ctx.rotate(-Math.PI / 2);

			ctx.translate(-canvas.width / 2, -canvas.height / 2);

			image.src = canvas.toDataURL();
		}

		return this;
	};

	$.fn.lotate = function() {

		var canvas = document.createElement("canvas");
		var ctx = canvas.getContext('2d');

		for (var i = 0, l = this.length; i < l; i++) {

			var image = this[i];
			var $image = $(image);

			if ('IMG' != $image.prop('tagName')) {
				continue;
			}

			ctx.clearRect(0, 0, canvas.width, canvas.height);

			canvas.width = image.height;
			canvas.height = image.width;

			ctx.translate(canvas.width / 2, canvas.height / 2);
			ctx.rotate(270 * Math.PI / 180);

			ctx.drawImage(image, -image.width / 2, -image.height / 2);

			ctx.rotate(-270 * Math.PI / 180);

			ctx.translate(-canvas.width / 2, -canvas.height / 2);

			image.src = canvas.toDataURL();
		}

		return this;
	};

}(jQuery));