/*
 Finite State Machine Designer (http://madebyevan.com/fsm/)
 License: MIT License (see below)

 Copyright (c) 2010 Evan Wallace

 Permission is hereby granted, free of charge, to any person
 obtaining a copy of this software and associated documentation
 files (the "Software"), to deal in the Software without
 restriction, including without limitation the rights to use,
 copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the
 Software is furnished to do so, subject to the following
 conditions:

 The above copyright notice and this permission notice shall be
 included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 OTHER DEALINGS IN THE SOFTWARE.
*/

function Link(a, b) {
	this.nodeA = a;
	this.nodeB = b;
	this.text = '';
	this.lineAngleAdjust = 0; // value to add to textAngle when link is straight line

	// make anchor point relative to the locations of nodeA and nodeB
	this.parallelPart = 0.5; // percentage from nodeA to nodeB
	this.perpendicularPart = 0; // pixels from line between nodeA and nodeB
}

Link.prototype.getAnchorPoint = function () {
	var dx = this.nodeB.x - this.nodeA.x;
	var dy = this.nodeB.y - this.nodeA.y;
	var scale = Math.sqrt(dx * dx + dy * dy);
	return {
		x:
			this.nodeA.x +
			dx * this.parallelPart -
			(dy * this.perpendicularPart) / scale,
		y:
			this.nodeA.y +
			dy * this.parallelPart +
			(dx * this.perpendicularPart) / scale,
	};
};

Link.prototype.setAnchorPoint = function (x, y) {
	var dx = this.nodeB.x - this.nodeA.x;
	var dy = this.nodeB.y - this.nodeA.y;
	var scale = Math.sqrt(dx * dx + dy * dy);
	this.parallelPart =
		(dx * (x - this.nodeA.x) + dy * (y - this.nodeA.y)) / (scale * scale);
	this.perpendicularPart =
		(dx * (y - this.nodeA.y) - dy * (x - this.nodeA.x)) / scale;
	// snap to a straight line
	if (
		this.parallelPart > 0 &&
		this.parallelPart < 1 &&
		Math.abs(this.perpendicularPart) < snapToPadding
	) {
		this.lineAngleAdjust = (this.perpendicularPart < 0) * Math.PI;
		this.perpendicularPart = 0;
	}
};

Link.prototype.getEndPointsAndCircle = function () {
	if (this.perpendicularPart == 0) {
		var midX = (this.nodeA.x + this.nodeB.x) / 2;
		var midY = (this.nodeA.y + this.nodeB.y) / 2;
		var start = this.nodeA.closestPointOnCircle(midX, midY);
		var end = this.nodeB.closestPointOnCircle(midX, midY);
		return {
			hasCircle: false,
			startX: start.x,
			startY: start.y,
			endX: end.x,
			endY: end.y,
		};
	}
	var anchor = this.getAnchorPoint();
	var circle = circleFromThreePoints(
		this.nodeA.x,
		this.nodeA.y,
		this.nodeB.x,
		this.nodeB.y,
		anchor.x,
		anchor.y,
	);
	var isReversed = this.perpendicularPart > 0;
	var reverseScale = isReversed ? 1 : -1;
	var startAngle =
		Math.atan2(this.nodeA.y - circle.y, this.nodeA.x - circle.x) -
		(reverseScale * nodeRadius) / circle.radius;
	var endAngle =
		Math.atan2(this.nodeB.y - circle.y, this.nodeB.x - circle.x) +
		(reverseScale * nodeRadius) / circle.radius;
	var startX = circle.x + circle.radius * Math.cos(startAngle);
	var startY = circle.y + circle.radius * Math.sin(startAngle);
	var endX = circle.x + circle.radius * Math.cos(endAngle);
	var endY = circle.y + circle.radius * Math.sin(endAngle);
	return {
		hasCircle: true,
		startX: startX,
		startY: startY,
		endX: endX,
		endY: endY,
		startAngle: startAngle,
		endAngle: endAngle,
		circleX: circle.x,
		circleY: circle.y,
		circleRadius: circle.radius,
		reverseScale: reverseScale,
		isReversed: isReversed,
	};
};

Link.prototype.draw = function (c) {
	var stuff = this.getEndPointsAndCircle();
	// draw arc
	c.beginPath();
	if (stuff.hasCircle) {
		c.arc(
			stuff.circleX,
			stuff.circleY,
			stuff.circleRadius,
			stuff.startAngle,
			stuff.endAngle,
			stuff.isReversed,
		);
	} else {
		c.moveTo(stuff.startX, stuff.startY);
		c.lineTo(stuff.endX, stuff.endY);
	}
	c.stroke();
	// draw the head of the arrow
	if (stuff.hasCircle) {
		drawArrow(
			c,
			stuff.endX,
			stuff.endY,
			stuff.endAngle - stuff.reverseScale * (Math.PI / 2),
		);
	} else {
		drawArrow(
			c,
			stuff.endX,
			stuff.endY,
			Math.atan2(stuff.endY - stuff.startY, stuff.endX - stuff.startX),
		);
	}
	// draw the text
	if (stuff.hasCircle) {
		var startAngle = stuff.startAngle;
		var endAngle = stuff.endAngle;
		if (endAngle < startAngle) {
			endAngle += Math.PI * 2;
		}
		var textAngle = (startAngle + endAngle) / 2 + stuff.isReversed * Math.PI;
		var textX = stuff.circleX + stuff.circleRadius * Math.cos(textAngle);
		var textY = stuff.circleY + stuff.circleRadius * Math.sin(textAngle);
		drawText(c, this.text, textX, textY, textAngle, selectedObject == this);
	} else {
		var textX = (stuff.startX + stuff.endX) / 2;
		var textY = (stuff.startY + stuff.endY) / 2;
		var textAngle = Math.atan2(
			stuff.endX - stuff.startX,
			stuff.startY - stuff.endY,
		);
		drawText(
			c,
			this.text,
			textX,
			textY,
			textAngle + this.lineAngleAdjust,
			selectedObject == this,
		);
	}
};

Link.prototype.containsPoint = function (x, y) {
	var stuff = this.getEndPointsAndCircle();
	if (stuff.hasCircle) {
		var dx = x - stuff.circleX;
		var dy = y - stuff.circleY;
		var distance = Math.sqrt(dx * dx + dy * dy) - stuff.circleRadius;
		if (Math.abs(distance) < hitTargetPadding) {
			var angle = Math.atan2(dy, dx);
			var startAngle = stuff.startAngle;
			var endAngle = stuff.endAngle;
			if (stuff.isReversed) {
				var temp = startAngle;
				startAngle = endAngle;
				endAngle = temp;
			}
			if (endAngle < startAngle) {
				endAngle += Math.PI * 2;
			}
			if (angle < startAngle) {
				angle += Math.PI * 2;
			} else if (angle > endAngle) {
				angle -= Math.PI * 2;
			}
			return angle > startAngle && angle < endAngle;
		}
	} else {
		var dx = stuff.endX - stuff.startX;
		var dy = stuff.endY - stuff.startY;
		var length = Math.sqrt(dx * dx + dy * dy);
		var percent =
			(dx * (x - stuff.startX) + dy * (y - stuff.startY)) / (length * length);
		var distance = (dx * (y - stuff.startY) - dy * (x - stuff.startX)) / length;
		return percent > 0 && percent < 1 && Math.abs(distance) < hitTargetPadding;
	}
	return false;
};

function Node(x, y) {
	this.x = x;
	this.y = y;
	this.mouseOffsetX = 0;
	this.mouseOffsetY = 0;
	this.isAcceptState = false;
	this.text = '';
}

Node.prototype.setMouseStart = function (x, y) {
	this.mouseOffsetX = this.x - x;
	this.mouseOffsetY = this.y - y;
};

Node.prototype.setAnchorPoint = function (x, y) {
	this.x = x + this.mouseOffsetX;
	this.y = y + this.mouseOffsetY;
};

Node.prototype.draw = function (c) {
	// draw the circle
	c.beginPath();
	c.arc(this.x, this.y, nodeRadius, 0, 2 * Math.PI, false);
	c.stroke();

	// draw the text
	drawText(c, this.text, this.x, this.y, null, selectedObject == this);

	// draw a double circle for an accept state
	if (this.isAcceptState) {
		c.beginPath();
		c.arc(this.x, this.y, nodeRadius - 6, 0, 2 * Math.PI, false);
		c.stroke();
	}
};

Node.prototype.closestPointOnCircle = function (x, y) {
	var dx = x - this.x;
	var dy = y - this.y;
	var scale = Math.sqrt(dx * dx + dy * dy);
	return {
		x: this.x + (dx * nodeRadius) / scale,
		y: this.y + (dy * nodeRadius) / scale,
	};
};

Node.prototype.containsPoint = function (x, y) {
	return (
		(x - this.x) * (x - this.x) + (y - this.y) * (y - this.y) <
		nodeRadius * nodeRadius
	);
};

function SelfLink(node, mouse) {
	this.node = node;
	this.anchorAngle = 0;
	this.mouseOffsetAngle = 0;
	this.text = '';

	if (mouse) {
		this.setAnchorPoint(mouse.x, mouse.y);
	}
}

SelfLink.prototype.setMouseStart = function (x, y) {
	this.mouseOffsetAngle =
		this.anchorAngle - Math.atan2(y - this.node.y, x - this.node.x);
};

SelfLink.prototype.setAnchorPoint = function (x, y) {
	this.anchorAngle =
		Math.atan2(y - this.node.y, x - this.node.x) + this.mouseOffsetAngle;
	// snap to 90 degrees
	var snap = Math.round(this.anchorAngle / (Math.PI / 2)) * (Math.PI / 2);
	if (Math.abs(this.anchorAngle - snap) < 0.1) this.anchorAngle = snap;
	// keep in the range -pi to pi so our containsPoint() function always works
	if (this.anchorAngle < -Math.PI) this.anchorAngle += 2 * Math.PI;
	if (this.anchorAngle > Math.PI) this.anchorAngle -= 2 * Math.PI;
};

SelfLink.prototype.getEndPointsAndCircle = function () {
	var circleX = this.node.x + 1.5 * nodeRadius * Math.cos(this.anchorAngle);
	var circleY = this.node.y + 1.5 * nodeRadius * Math.sin(this.anchorAngle);
	var circleRadius = 0.75 * nodeRadius;
	var startAngle = this.anchorAngle - Math.PI * 0.8;
	var endAngle = this.anchorAngle + Math.PI * 0.8;
	var startX = circleX + circleRadius * Math.cos(startAngle);
	var startY = circleY + circleRadius * Math.sin(startAngle);
	var endX = circleX + circleRadius * Math.cos(endAngle);
	var endY = circleY + circleRadius * Math.sin(endAngle);
	return {
		hasCircle: true,
		startX: startX,
		startY: startY,
		endX: endX,
		endY: endY,
		startAngle: startAngle,
		endAngle: endAngle,
		circleX: circleX,
		circleY: circleY,
		circleRadius: circleRadius,
	};
};

SelfLink.prototype.draw = function (c) {
	var stuff = this.getEndPointsAndCircle();
	// draw arc
	c.beginPath();
	c.arc(
		stuff.circleX,
		stuff.circleY,
		stuff.circleRadius,
		stuff.startAngle,
		stuff.endAngle,
		false,
	);
	c.stroke();
	// draw the text on the loop farthest from the node
	var textX = stuff.circleX + stuff.circleRadius * Math.cos(this.anchorAngle);
	var textY = stuff.circleY + stuff.circleRadius * Math.sin(this.anchorAngle);
	drawText(
		c,
		this.text,
		textX,
		textY,
		this.anchorAngle,
		selectedObject == this,
	);
	// draw the head of the arrow
	drawArrow(c, stuff.endX, stuff.endY, stuff.endAngle + Math.PI * 0.4);
};

SelfLink.prototype.containsPoint = function (x, y) {
	var stuff = this.getEndPointsAndCircle();
	var dx = x - stuff.circleX;
	var dy = y - stuff.circleY;
	var distance = Math.sqrt(dx * dx + dy * dy) - stuff.circleRadius;
	return Math.abs(distance) < hitTargetPadding;
};

function StartLink(node, start) {
	this.node = node;
	this.deltaX = 0;
	this.deltaY = 0;
	this.text = '';

	if (start) {
		this.setAnchorPoint(start.x, start.y);
	}
}

StartLink.prototype.setAnchorPoint = function (x, y) {
	this.deltaX = x - this.node.x;
	this.deltaY = y - this.node.y;

	if (Math.abs(this.deltaX) < snapToPadding) {
		this.deltaX = 0;
	}

	if (Math.abs(this.deltaY) < snapToPadding) {
		this.deltaY = 0;
	}
};

StartLink.prototype.getEndPoints = function () {
	var startX = this.node.x + this.deltaX;
	var startY = this.node.y + this.deltaY;
	var end = this.node.closestPointOnCircle(startX, startY);
	return {
		startX: startX,
		startY: startY,
		endX: end.x,
		endY: end.y,
	};
};

StartLink.prototype.draw = function (c) {
	var stuff = this.getEndPoints();

	// draw the line
	c.beginPath();
	c.moveTo(stuff.startX, stuff.startY);
	c.lineTo(stuff.endX, stuff.endY);
	c.stroke();

	// draw the text at the end without the arrow
	var textAngle = Math.atan2(
		stuff.startY - stuff.endY,
		stuff.startX - stuff.endX,
	);
	drawText(
		c,
		this.text,
		stuff.startX,
		stuff.startY,
		textAngle,
		selectedObject == this,
	);

	// draw the head of the arrow
	drawArrow(c, stuff.endX, stuff.endY, Math.atan2(-this.deltaY, -this.deltaX));
};

StartLink.prototype.containsPoint = function (x, y) {
	var stuff = this.getEndPoints();
	var dx = stuff.endX - stuff.startX;
	var dy = stuff.endY - stuff.startY;
	var length = Math.sqrt(dx * dx + dy * dy);
	var percent =
		(dx * (x - stuff.startX) + dy * (y - stuff.startY)) / (length * length);
	var distance = (dx * (y - stuff.startY) - dy * (x - stuff.startX)) / length;
	return percent > 0 && percent < 1 && Math.abs(distance) < hitTargetPadding;
};

function TemporaryLink(from, to) {
	this.from = from;
	this.to = to;
}

TemporaryLink.prototype.draw = function (c) {
	// draw the line
	c.beginPath();
	c.moveTo(this.to.x, this.to.y);
	c.lineTo(this.from.x, this.from.y);
	c.stroke();

	// draw the head of the arrow
	drawArrow(
		c,
		this.to.x,
		this.to.y,
		Math.atan2(this.to.y - this.from.y, this.to.x - this.from.x),
	);
};

// draw using this instead of a canvas and call toLaTeX() afterward

// from upstream PR #17: escape LaTeX specials before wrapping the label in $...$
// math mode. PR #17 only escaped `$` with a non-global string literal (first match
// only); we use /g and cover the rest of the math-mode specials.
function escapeLaTeX(s) {
	return s
		.replace(/\$/g, '\\$')
		.replace(/%/g, '\\%')
		.replace(/&/g, '\\&')
		.replace(/#/g, '\\#')
		.replace(/_/g, '\\_')
		.replace(/\{/g, '\\{')
		.replace(/\}/g, '\\}');
}

function ExportAsLaTeX() {
	this._points = [];
	this._texData = '';
	this._scale = 0.1; // to convert pixels to document space (TikZ breaks if the numbers get too big, above 500?)

	// from upstream PR #23: 'snippet' mode emits just the tikzpicture block so
	// the result can be pasted into an existing LaTeX document. 'standalone'
	// is the historical default.
	this.toLaTeX = function (mode) {
		var picture =
			'\\begin{tikzpicture}[scale=0.2]\n' +
			'\\tikzstyle{every node}+=[inner sep=0pt]\n' +
			this._texData +
			'\\end{tikzpicture}\n';
		if (mode === 'snippet') return picture;
		return (
			'\\documentclass[12pt]{article}\n' +
			'\\usepackage{tikz}\n' +
			'\n' +
			'\\begin{document}\n' +
			'\n' +
			'\\begin{center}\n' +
			picture +
			'\\end{center}\n' +
			'\n' +
			'\\end{document}\n'
		);
	};

	this.beginPath = function () {
		this._points = [];
	};
	this.arc = function (x, y, radius, startAngle, endAngle, isReversed) {
		x *= this._scale;
		y *= this._scale;
		radius *= this._scale;
		if (endAngle - startAngle == Math.PI * 2) {
			this._texData +=
				'\\draw [' +
				this.strokeStyle +
				'] (' +
				fixed(x, 3) +
				',' +
				fixed(-y, 3) +
				') circle (' +
				fixed(radius, 3) +
				');\n';
		} else {
			if (isReversed) {
				var temp = startAngle;
				startAngle = endAngle;
				endAngle = temp;
			}
			if (endAngle < startAngle) {
				endAngle += Math.PI * 2;
			}
			// TikZ needs the angles to be in between -2pi and 2pi or it breaks
			if (Math.min(startAngle, endAngle) < -2 * Math.PI) {
				startAngle += 2 * Math.PI;
				endAngle += 2 * Math.PI;
			} else if (Math.max(startAngle, endAngle) > 2 * Math.PI) {
				startAngle -= 2 * Math.PI;
				endAngle -= 2 * Math.PI;
			}
			startAngle = -startAngle;
			endAngle = -endAngle;
			this._texData +=
				'\\draw [' +
				this.strokeStyle +
				'] (' +
				fixed(x + radius * Math.cos(startAngle), 3) +
				',' +
				fixed(-y + radius * Math.sin(startAngle), 3) +
				') arc (' +
				fixed((startAngle * 180) / Math.PI, 5) +
				':' +
				fixed((endAngle * 180) / Math.PI, 5) +
				':' +
				fixed(radius, 3) +
				');\n';
		}
	};
	this.moveTo = this.lineTo = function (x, y) {
		x *= this._scale;
		y *= this._scale;
		this._points.push({ x: x, y: y });
	};
	this.stroke = function () {
		if (this._points.length == 0) return;
		this._texData += '\\draw [' + this.strokeStyle + ']';
		for (var i = 0; i < this._points.length; i++) {
			var p = this._points[i];
			this._texData +=
				(i > 0 ? ' --' : '') +
				' (' +
				fixed(p.x, 2) +
				',' +
				fixed(-p.y, 2) +
				')';
		}
		this._texData += ';\n';
	};
	this.fill = function () {
		if (this._points.length == 0) return;
		this._texData += '\\fill [' + this.strokeStyle + ']';
		for (var i = 0; i < this._points.length; i++) {
			var p = this._points[i];
			this._texData +=
				(i > 0 ? ' --' : '') +
				' (' +
				fixed(p.x, 2) +
				',' +
				fixed(-p.y, 2) +
				')';
		}
		this._texData += ';\n';
	};
	this.measureText = function (text) {
		var c = canvas.getContext('2d');
		c.font = '20px "Times New Roman", serif';
		return c.measureText(text);
	};
	this.advancedFillText = function (text, originalText, x, y, angleOrNull) {
		if (text.replace(' ', '').length > 0) {
			var nodeParams = '';
			// x and y start off as the center of the text, but will be moved to one side of the box when angleOrNull != null
			if (angleOrNull != null) {
				var width = this.measureText(text).width;
				var dx = Math.cos(angleOrNull);
				var dy = Math.sin(angleOrNull);
				if (Math.abs(dx) > Math.abs(dy)) {
					if (dx > 0) ((nodeParams = '[right] '), (x -= width / 2));
					else ((nodeParams = '[left] '), (x += width / 2));
				} else {
					if (dy > 0) ((nodeParams = '[below] '), (y -= 10));
					else ((nodeParams = '[above] '), (y += 10));
				}
			}
			x *= this._scale;
			y *= this._scale;
			this._texData +=
				'\\draw (' +
				fixed(x, 2) +
				',' +
				fixed(-y, 2) +
				') node ' +
				nodeParams +
				'{$' +
				escapeLaTeX(originalText).replace(/ /g, '\\mbox{ }') +
				'$};\n';
		}
	};

	this.translate = this.save = this.restore = this.clearRect = function () {};
}

// draw using this instead of a canvas and call toSVG() afterward
function ExportAsSVG() {
	this.fillStyle = 'black';
	this.strokeStyle = 'black';
	this.lineWidth = 1;
	this.font = '12px Arial, sans-serif';
	this._points = [];
	this._svgData = '';
	this._transX = 0;
	this._transY = 0;

	this.toSVG = function () {
		return (
			'<?xml version="1.0" standalone="no"?>\n<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n\n<svg width="800" height="600" version="1.1" xmlns="http://www.w3.org/2000/svg">\n' +
			this._svgData +
			'</svg>\n'
		);
	};

	this.beginPath = function () {
		this._points = [];
	};
	this.arc = function (x, y, radius, startAngle, endAngle, isReversed) {
		x += this._transX;
		y += this._transY;
		var style =
			'stroke="' +
			this.strokeStyle +
			'" stroke-width="' +
			this.lineWidth +
			'" fill="none"';

		if (endAngle - startAngle == Math.PI * 2) {
			this._svgData +=
				'\t<ellipse ' +
				style +
				' cx="' +
				fixed(x, 3) +
				'" cy="' +
				fixed(y, 3) +
				'" rx="' +
				fixed(radius, 3) +
				'" ry="' +
				fixed(radius, 3) +
				'"/>\n';
		} else {
			if (isReversed) {
				var temp = startAngle;
				startAngle = endAngle;
				endAngle = temp;
			}

			if (endAngle < startAngle) {
				endAngle += Math.PI * 2;
			}

			var startX = x + radius * Math.cos(startAngle);
			var startY = y + radius * Math.sin(startAngle);
			var endX = x + radius * Math.cos(endAngle);
			var endY = y + radius * Math.sin(endAngle);
			var useGreaterThan180 = Math.abs(endAngle - startAngle) > Math.PI;
			var goInPositiveDirection = 1;

			this._svgData += '\t<path ' + style + ' d="';
			this._svgData += 'M ' + fixed(startX, 3) + ',' + fixed(startY, 3) + ' '; // startPoint(startX, startY)
			this._svgData += 'A ' + fixed(radius, 3) + ',' + fixed(radius, 3) + ' '; // radii(radius, radius)
			this._svgData += '0 '; // value of 0 means perfect circle, others mean ellipse
			this._svgData += +useGreaterThan180 + ' ';
			this._svgData += +goInPositiveDirection + ' ';
			this._svgData += fixed(endX, 3) + ',' + fixed(endY, 3); // endPoint(endX, endY)
			this._svgData += '"/>\n';
		}
	};
	this.moveTo = this.lineTo = function (x, y) {
		x += this._transX;
		y += this._transY;
		this._points.push({ x: x, y: y });
	};
	this.stroke = function () {
		if (this._points.length == 0) return;
		this._svgData +=
			'\t<polygon stroke="' +
			this.strokeStyle +
			'" stroke-width="' +
			this.lineWidth +
			'" points="';
		for (var i = 0; i < this._points.length; i++) {
			this._svgData +=
				(i > 0 ? ' ' : '') +
				fixed(this._points[i].x, 3) +
				',' +
				fixed(this._points[i].y, 3);
		}
		this._svgData += '"/>\n';
	};
	this.fill = function () {
		if (this._points.length == 0) return;
		this._svgData +=
			'\t<polygon fill="' +
			this.fillStyle +
			'" stroke-width="' +
			this.lineWidth +
			'" points="';
		for (var i = 0; i < this._points.length; i++) {
			this._svgData +=
				(i > 0 ? ' ' : '') +
				fixed(this._points[i].x, 3) +
				',' +
				fixed(this._points[i].y, 3);
		}
		this._svgData += '"/>\n';
	};
	this.measureText = function (text) {
		var c = canvas.getContext('2d');
		c.font = '20px "Times New Roman", serif';
		return c.measureText(text);
	};
	this.fillText = function (text, x, y) {
		x += this._transX;
		y += this._transY;
		if (text.replace(' ', '').length > 0) {
			this._svgData +=
				'\t<text x="' +
				fixed(x, 3) +
				'" y="' +
				fixed(y, 3) +
				'" font-family="Times New Roman" font-size="20">' +
				textToXML(text) +
				'</text>\n';
		}
	};
	this.translate = function (x, y) {
		this._transX = x;
		this._transY = y;
	};

	this.save = this.restore = this.clearRect = function () {};
}

// Demo FSMs that show off the editor's algorithms. Each builder returns
// FSM JSON; coordinates default to 0,0 because applyFSMJsonAsNew() runs
// auto-layout before drawing.

function _link(from, to, sym) {
	if (from === to) {
		return {
			type: 'SelfLink',
			node: from,
			text: sym,
			anchorAngle: -Math.PI / 2,
		};
	}
	return {
		type: 'Link',
		nodeA: from,
		nodeB: to,
		text: sym,
		lineAngleAdjust: 0,
		parallelPart: 0.5,
		perpendicularPart: 0,
	};
}

function _node(text, isAccept) {
	return { x: 0, y: 0, text: text, isAcceptState: !!isAccept };
}

function _wrap(nodes, links, startIdx) {
	return {
		format: SAVE_FORMAT,
		nodes: nodes,
		links: [
			{
				type: 'StartLink',
				node: startIdx,
				text: '',
				deltaX: -50,
				deltaY: 0,
			},
		].concat(links),
	};
}

function exampleDivisibleBy3() {
	return _wrap(
		[_node('mod 0', true), _node('mod 1', false), _node('mod 2', false)],
		[
			_link(0, 0, '0'),
			_link(0, 1, '1'),
			_link(1, 2, '0'),
			_link(1, 0, '1'),
			_link(2, 1, '0'),
			_link(2, 2, '1'),
		],
		0,
	);
}

function exampleContainsAB() {
	return _wrap(
		[_node('q0', false), _node('q1 (saw a)', false), _node('q2', true)],
		[
			_link(0, 0, 'b'),
			_link(0, 1, 'a'),
			_link(1, 1, 'a'),
			_link(1, 2, 'b'),
			_link(2, 2, 'a,b'),
		],
		0,
	);
}

function exampleRegexAbb() {
	return regexToNFA('(a|b)*abb');
}

function exampleMod4Counter() {
	return _wrap(
		[_node('0', true), _node('1', false), _node('2', false), _node('3', false)],
		[_link(0, 1, 't'), _link(1, 2, 't'), _link(2, 3, 't'), _link(3, 0, 't')],
		0,
	);
}

function exampleNFAEpsilon() {
	return _wrap(
		[
			_node('start', false),
			_node('branch a', false),
			_node('branch b', false),
			_node('a-seen', false),
			_node('b-seen', false),
			_node('accept', true),
		],
		[
			_link(0, 1, ''),
			_link(0, 2, ''),
			_link(1, 3, 'a'),
			_link(3, 5, ''),
			_link(2, 4, 'b'),
			_link(4, 5, ''),
		],
		0,
	);
}

function exampleNonMinimalDFA() {
	// Accepts strings ending in "01" but with two redundant accept paths.
	// q1 and q1' both behave identically: minimizing should merge them.
	return _wrap(
		[
			_node('q0', false),
			_node('q1', false),
			_node('q2', true),
			_node("q1'", false),
			_node("q2'", true),
		],
		[
			_link(0, 1, '0'),
			_link(0, 3, '1'),
			_link(1, 1, '0'),
			_link(1, 2, '1'),
			_link(2, 1, '0'),
			_link(2, 4, '1'),
			_link(3, 1, '0'),
			_link(3, 3, '1'),
			_link(4, 1, '0'),
			_link(4, 4, '1'),
		],
		0,
	);
}

var EXAMPLES = [
	{ name: 'Divisible by 3 (binary)', build: exampleDivisibleBy3 },
	{ name: 'Contains "ab"', build: exampleContainsAB },
	{ name: 'Regex (a|b)*abb', build: exampleRegexAbb },
	{ name: 'Mod-4 counter (Moore-style)', build: exampleMod4Counter },
	{ name: 'NFA with epsilon transitions', build: exampleNFAEpsilon },
	{ name: 'Non-minimal DFA (try Minimize)', build: exampleNonMinimalDFA },
];

// from upstream PR #39: expanded shortcut table covering ops, set theory, logic,
// arrows. Kept as a category-grouped list so ui.js can render the help modal
// straight from it without a second copy.
var LATEX_SHORTCUTS = [
	{
		name: 'Greek (lowercase)',
		entries: [
			['\\alpha', 'α'],
			['\\beta', 'β'],
			['\\gamma', 'γ'],
			['\\delta', 'δ'],
			['\\epsilon', 'ε'],
			['\\zeta', 'ζ'],
			['\\eta', 'η'],
			['\\theta', 'θ'],
			['\\iota', 'ι'],
			['\\kappa', 'κ'],
			['\\lambda', 'λ'],
			['\\mu', 'μ'],
			['\\nu', 'ν'],
			['\\xi', 'ξ'],
			['\\omicron', 'ο'],
			['\\pi', 'π'],
			['\\rho', 'ρ'],
			['\\sigma', 'σ'],
			['\\tau', 'τ'],
			['\\upsilon', 'υ'],
			['\\phi', 'φ'],
			['\\chi', 'χ'],
			['\\psi', 'ψ'],
			['\\omega', 'ω'],
		],
	},
	{
		name: 'Greek (uppercase)',
		entries: [
			['\\Alpha', 'Α'],
			['\\Beta', 'Β'],
			['\\Gamma', 'Γ'],
			['\\Delta', 'Δ'],
			['\\Epsilon', 'Ε'],
			['\\Zeta', 'Ζ'],
			['\\Eta', 'Η'],
			['\\Theta', 'Θ'],
			['\\Iota', 'Ι'],
			['\\Kappa', 'Κ'],
			['\\Lambda', 'Λ'],
			['\\Mu', 'Μ'],
			['\\Nu', 'Ν'],
			['\\Xi', 'Ξ'],
			['\\Omicron', 'Ο'],
			['\\Pi', 'Π'],
			['\\Rho', 'Ρ'],
			['\\Sigma', 'Σ'],
			['\\Tau', 'Τ'],
			['\\Upsilon', 'Υ'],
			['\\Phi', 'Φ'],
			['\\Chi', 'Χ'],
			['\\Psi', 'Ψ'],
			['\\Omega', 'Ω'],
		],
	},
	{
		name: 'Operators',
		entries: [
			['\\times', '×'],
			['\\div', '÷'],
			['\\pm', '±'],
			['\\leq', '≤'],
			['\\le', '≤'],
			['\\geq', '≥'],
			['\\ge', '≥'],
			['\\neq', '≠'],
			['\\ne', '≠'],
			['\\approx', '≈'],
			['\\infty', '∞'],
			['\\sum', '∑'],
			['\\prod', '∏'],
			['\\int', '∫'],
			['\\cdot', '·'],
		],
	},
	{
		name: 'Set theory',
		entries: [
			['\\cup', '∪'],
			['\\cap', '∩'],
			['\\subseteq', '⊆'],
			['\\subset', '⊂'],
			['\\supseteq', '⊇'],
			['\\supset', '⊃'],
			['\\notin', '∉'],
			['\\in', '∈'],
			['\\emptyset', '∅'],
		],
	},
	{
		name: 'Logic',
		entries: [
			['\\land', '∧'],
			['\\lor', '∨'],
			['\\neg', '¬'],
			['\\forall', '∀'],
			['\\exists', '∃'],
			['\\Rightarrow', '⇒'],
			['\\Leftrightarrow', '⇔'],
		],
	},
	{
		name: 'Arrows',
		entries: [
			['\\leftrightarrow', '↔'],
			['\\rightarrow', '→'],
			['\\leftarrow', '←'],
			['\\to', '→'],
			['\\gets', '←'],
		],
	},
	{
		name: 'Subscripts',
		entries: [
			['_0', '₀'],
			['_1', '₁'],
			['_2', '₂'],
			['_3', '₃'],
			['_4', '₄'],
			['_5', '₅'],
			['_6', '₆'],
			['_7', '₇'],
			['_8', '₈'],
			['_9', '₉'],
		],
	},
];

// Sort longest-first so \leq beats \le, \rightarrow beats \to, etc.
var LATEX_SHORTCUT_RULES = (function () {
	var flat = [];
	for (var i = 0; i < LATEX_SHORTCUTS.length; i++) {
		var entries = LATEX_SHORTCUTS[i].entries;
		for (var j = 0; j < entries.length; j++) flat.push(entries[j]);
	}
	flat.sort(function (a, b) {
		return b[0].length - a[0].length;
	});
	return flat.map(function (e) {
		var pattern = e[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		return [new RegExp(pattern, 'g'), e[1]];
	});
})();

function convertLatexShortcuts(text) {
	for (var i = 0; i < LATEX_SHORTCUT_RULES.length; i++) {
		text = text.replace(LATEX_SHORTCUT_RULES[i][0], LATEX_SHORTCUT_RULES[i][1]);
	}
	return text;
}

function textToXML(text) {
	text = text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
	var result = '';
	for (var i = 0; i < text.length; i++) {
		var c = text.charCodeAt(i);
		if (c >= 0x20 && c <= 0x7e) {
			result += text[i];
		} else {
			result += '&#' + c + ';';
		}
	}
	return result;
}

function drawArrow(c, x, y, angle) {
	var dx = Math.cos(angle);
	var dy = Math.sin(angle);
	c.beginPath();
	c.moveTo(x, y);
	c.lineTo(x - 8 * dx + 5 * dy, y - 8 * dy - 5 * dx);
	c.lineTo(x - 8 * dx - 5 * dy, y - 8 * dy + 5 * dx);
	c.fill();
}

function canvasHasFocus() {
	var a = document.activeElement || document.body;
	return a === document.body || a === canvas;
}

function drawText(c, originalText, x, y, angleOrNull, isSelected) {
	var text = convertLatexShortcuts(originalText);
	c.font = '20px "Times New Roman", serif';
	var width = c.measureText(text).width;

	// center the text
	x -= width / 2;

	// position the text intelligently if given an angle
	if (angleOrNull != null) {
		var cos = Math.cos(angleOrNull);
		var sin = Math.sin(angleOrNull);
		var cornerPointX = (width / 2 + 5) * (cos > 0 ? 1 : -1);
		var cornerPointY = (10 + 5) * (sin > 0 ? 1 : -1);
		var slide =
			sin * Math.pow(Math.abs(sin), 40) * cornerPointX -
			cos * Math.pow(Math.abs(cos), 10) * cornerPointY;
		x += cornerPointX - sin * slide;
		y += cornerPointY + cos * slide;
	}

	// draw text and caret (round the coordinates so the caret falls on a pixel)
	if ('advancedFillText' in c) {
		c.advancedFillText(text, originalText, x + width / 2, y, angleOrNull);
	} else {
		x = Math.round(x);
		y = Math.round(y);
		c.fillText(text, x, y + 6);
		if (isSelected && caretVisible && canvasHasFocus() && document.hasFocus()) {
			x += width;
			c.beginPath();
			c.moveTo(x, y - 10);
			c.lineTo(x, y + 10);
			c.stroke();
		}
	}
}

var caretTimer;
var caretVisible = true;

function resetCaret() {
	clearInterval(caretTimer);
	caretTimer = setInterval(function () {
		caretVisible = !caretVisible;
		draw();
	}, 500);
	caretVisible = true;
}

var canvas;
var nodeRadius = 30;
var nodes = [];
var links = [];

var cursorVisible = true;
var snapToPadding = 6; // pixels
var hitTargetPadding = 6; // pixels
var selectedObject = null; // either a Link or a Node
var currentLink = null; // a Link
var movingObject = false;
var originalClick;
// set by ui.js while a simulation panel is active. { active: [stateIdx...], lastLink, accepted, error }
var simulationState = null;

function getDrawColors() {
	try {
		var s = getComputedStyle(document.body);
		var fg = (s.getPropertyValue('--canvas-fg') || '').trim();
		var sel = (s.getPropertyValue('--canvas-selected') || '').trim();
		return { fg: fg || 'black', selected: sel || 'blue' };
	} catch (e) {
		return { fg: 'black', selected: 'blue' };
	}
}

var EXPORT_COLORS = { fg: 'black', selected: 'black' };

function drawUsing(c, colors) {
	colors = colors || getDrawColors();
	c.clearRect(0, 0, canvas.width, canvas.height);
	c.save();
	c.translate(0.5, 0.5);

	for (var i = 0; i < nodes.length; i++) {
		c.lineWidth = 1;
		c.fillStyle = c.strokeStyle =
			nodes[i] == selectedObject ? colors.selected : colors.fg;
		nodes[i].draw(c);
	}
	for (var i = 0; i < links.length; i++) {
		c.lineWidth = 1;
		c.fillStyle = c.strokeStyle =
			links[i] == selectedObject ? colors.selected : colors.fg;
		links[i].draw(c);
	}
	if (currentLink != null) {
		c.lineWidth = 1;
		c.fillStyle = c.strokeStyle = colors.fg;
		currentLink.draw(c);
	}

	c.restore();
}

function draw() {
	drawUsing(canvas.getContext('2d'));
	drawSimulationOverlay();
	saveBackup();
}

function drawSimulationOverlay() {
	if (!simulationState) return;
	var c = canvas.getContext('2d');
	c.save();
	c.translate(0.5, 0.5);
	c.lineWidth = 3;
	c.strokeStyle = simulationState.accepted
		? '#2ca44b'
		: simulationState.error
			? '#c0392b'
			: '#2c7be5';
	var active = simulationState.active || [];
	for (var i = 0; i < active.length; i++) {
		var n = nodes[active[i]];
		if (!n) continue;
		c.beginPath();
		c.arc(n.x, n.y, nodeRadius + 5, 0, 2 * Math.PI);
		c.stroke();
	}
	if (simulationState.lastLink) {
		c.lineWidth = 4;
		c.strokeStyle = '#f0a500';
		c.fillStyle = '#f0a500';
		simulationState.lastLink.draw(c);
	}
	c.restore();
}

function selectObject(x, y) {
	for (var i = 0; i < nodes.length; i++) {
		if (nodes[i].containsPoint(x, y)) {
			return nodes[i];
		}
	}
	for (var i = 0; i < links.length; i++) {
		if (links[i].containsPoint(x, y)) {
			return links[i];
		}
	}
	return null;
}

function snapNode(node) {
	for (var i = 0; i < nodes.length; i++) {
		if (nodes[i] == node) continue;

		if (Math.abs(node.x - nodes[i].x) < snapToPadding) {
			node.x = nodes[i].x;
		}

		if (Math.abs(node.y - nodes[i].y) < snapToPadding) {
			node.y = nodes[i].y;
		}
	}
}

window.onload = function () {
	canvas = document.getElementById('canvas');

	if (typeof Theme !== 'undefined') Theme.init();
	Workspace.init();
	restoreBackup();
	if (typeof maybeLoadFromHash === 'function') maybeLoadFromHash();
	History.reset(snapshotJSON());

	if (typeof wireUI === 'function') wireUI();

	draw();

	canvas.onmousedown = function (e) {
		var mouse = crossBrowserRelativeMousePos(e);
		flushHistory();
		selectedObject = selectObject(mouse.x, mouse.y);
		movingObject = false;
		originalClick = mouse;

		if (selectedObject != null) {
			if (shift && selectedObject instanceof Node) {
				currentLink = new SelfLink(selectedObject, mouse);
			} else {
				movingObject = true;
				deltaMouseX = deltaMouseY = 0;
				if (selectedObject.setMouseStart) {
					selectedObject.setMouseStart(mouse.x, mouse.y);
				}
			}
			resetCaret();
		} else if (shift) {
			currentLink = new TemporaryLink(mouse, mouse);
		}

		draw();

		if (canvasHasFocus()) {
			// disable drag-and-drop only if the canvas is already focused
			return false;
		} else {
			// otherwise, let the browser switch the focus away from wherever it was
			resetCaret();
			return true;
		}
	};

	canvas.ondblclick = function (e) {
		var mouse = crossBrowserRelativeMousePos(e);
		flushHistory();
		selectedObject = selectObject(mouse.x, mouse.y);

		if (selectedObject == null) {
			selectedObject = new Node(mouse.x, mouse.y);
			nodes.push(selectedObject);
			resetCaret();
			draw();
			commitHistory();
		} else if (selectedObject instanceof Node) {
			selectedObject.isAcceptState = !selectedObject.isAcceptState;
			draw();
			commitHistory();
		}
	};

	canvas.onmousemove = function (e) {
		var mouse = crossBrowserRelativeMousePos(e);

		if (currentLink != null) {
			var targetNode = selectObject(mouse.x, mouse.y);
			if (!(targetNode instanceof Node)) {
				targetNode = null;
			}

			if (selectedObject == null) {
				if (targetNode != null) {
					currentLink = new StartLink(targetNode, originalClick);
				} else {
					currentLink = new TemporaryLink(originalClick, mouse);
				}
			} else {
				if (targetNode == selectedObject) {
					currentLink = new SelfLink(selectedObject, mouse);
				} else if (targetNode != null) {
					currentLink = new Link(selectedObject, targetNode);
				} else {
					currentLink = new TemporaryLink(
						selectedObject.closestPointOnCircle(mouse.x, mouse.y),
						mouse,
					);
				}
			}
			draw();
		}

		if (movingObject) {
			selectedObject.setAnchorPoint(mouse.x, mouse.y);
			if (selectedObject instanceof Node) {
				snapNode(selectedObject);
			}
			draw();
		}
	};

	canvas.onmouseup = function (e) {
		var didChange = movingObject;
		movingObject = false;

		if (currentLink != null) {
			if (!(currentLink instanceof TemporaryLink)) {
				selectedObject = currentLink;
				links.push(currentLink);
				resetCaret();
				didChange = true;
			}
			currentLink = null;
			draw();
		}

		if (didChange) commitHistory();
	};

	// from upstream PR #44: touch -> mouse adapter. Single finger only; multi-touch
	// falls through to the browser (pinch-zoom etc). preventDefault stops the
	// 300ms ghost-click and page scrolling during canvas interaction.
	function touchPos(t) {
		return { clientX: t.clientX, clientY: t.clientY };
	}

	canvas.addEventListener(
		'touchstart',
		function (e) {
			if (e.touches.length !== 1) return;
			e.preventDefault();
			var t = e.touches[0];
			var now = Date.now();
			if (
				lastTap &&
				now - lastTap.t < 300 &&
				Math.abs(t.clientX - lastTap.x) < 30 &&
				Math.abs(t.clientY - lastTap.y) < 30
			) {
				lastTap = null;
				canvas.ondblclick(touchPos(t));
				return;
			}
			lastTap = { t: now, x: t.clientX, y: t.clientY };
			if (touchArrowMode) shift = true;
			canvas.onmousedown(touchPos(t));
		},
		{ passive: false },
	);

	canvas.addEventListener(
		'touchmove',
		function (e) {
			if (e.touches.length !== 1) return;
			e.preventDefault();
			canvas.onmousemove(touchPos(e.touches[0]));
		},
		{ passive: false },
	);

	canvas.addEventListener('touchend', function (e) {
		var t = e.changedTouches && e.changedTouches[0];
		if (t) canvas.onmouseup(touchPos(t));
		if (touchArrowMode) shift = false;
	});
};

var shift = false;
// from upstream PR #44: touch has no shift key, so a UI toggle promotes single-finger
// drag from "move" to "create arrow". Set by the arrow-mode button in ui.js.
var touchArrowMode = false;
var lastTap = null;
// Keyboard-only "link mode": L starts it from the selected node, Tab cycles
// through candidate targets, Enter confirms, Escape cancels.
var linkMode = false;

function selectionOrder() {
	var ns = nodes.slice().sort(function (a, b) {
		return (a.text || '').localeCompare(b.text || '');
	});
	var ls = links
		.slice()
		.filter(function (l) {
			return (
				l instanceof Link || l instanceof SelfLink || l instanceof StartLink
			);
		})
		.sort(function (a, b) {
			return (a.text || '').localeCompare(b.text || '');
		});
	return ns.concat(ls);
}

function cycleSelection(direction) {
	var order = selectionOrder();
	if (!order.length) return;
	var idx = order.indexOf(selectedObject);
	if (idx === -1) idx = direction > 0 ? -1 : 0;
	idx = (idx + (direction > 0 ? 1 : -1) + order.length) % order.length;
	selectedObject = order[idx];
	resetCaret();
	draw();
}

function nodesSortedByLabel() {
	return nodes.slice().sort(function (a, b) {
		return (a.text || '').localeCompare(b.text || '');
	});
}

function startKeyboardLink() {
	if (!(selectedObject instanceof Node)) return;
	var from = selectedObject;
	var others = nodes.filter(function (n) {
		return n !== from;
	});
	if (others.length) {
		var sorted = others.sort(function (a, b) {
			return (a.text || '').localeCompare(b.text || '');
		});
		currentLink = new Link(from, sorted[0]);
	} else {
		currentLink = new SelfLink(from, { x: from.x, y: from.y - 60 });
	}
	linkMode = true;
	draw();
}

function cycleKeyboardLinkTarget(direction) {
	if (!linkMode || !currentLink) return;
	var from = selectedObject;
	var sorted = nodesSortedByLabel();
	var current;
	if (currentLink instanceof Link) current = currentLink.nodeB;
	else if (currentLink instanceof SelfLink) current = currentLink.node;
	var idx = sorted.indexOf(current);
	idx = (idx + (direction > 0 ? 1 : -1) + sorted.length) % sorted.length;
	var target = sorted[idx];
	if (target === from) {
		currentLink = new SelfLink(from, { x: from.x, y: from.y - 60 });
	} else {
		currentLink = new Link(from, target);
	}
	draw();
}

function confirmKeyboardLink() {
	if (!linkMode || !currentLink) return;
	flushHistory();
	links.push(currentLink);
	selectedObject = currentLink;
	currentLink = null;
	linkMode = false;
	commitHistory();
	draw();
}

function cancelKeyboardLink() {
	linkMode = false;
	currentLink = null;
	draw();
}

function createNodeAtCenter() {
	flushHistory();
	var node = new Node(canvas.width / 2, canvas.height / 2);
	nodes.push(node);
	selectedObject = node;
	resetCaret();
	draw();
	commitHistory();
}

function nudgeSelected(dx, dy) {
	if (!(selectedObject instanceof Node)) return;
	selectedObject.x += dx;
	selectedObject.y += dy;
	draw();
	commitHistoryDebounced();
}

function deleteSelected() {
	if (selectedObject == null) return;
	flushHistory();
	for (var i = 0; i < nodes.length; i++) {
		if (nodes[i] == selectedObject) {
			nodes.splice(i--, 1);
		}
	}
	for (var i = 0; i < links.length; i++) {
		if (
			links[i] == selectedObject ||
			links[i].node == selectedObject ||
			links[i].nodeA == selectedObject ||
			links[i].nodeB == selectedObject
		) {
			links.splice(i--, 1);
		}
	}
	selectedObject = null;
	commitHistory();
	draw();
}

function clearAll() {
	if (nodes.length === 0 && links.length === 0) return;
	if (!confirm('Clear all states and arrows in this FSM?')) return;
	flushHistory();
	nodes.length = 0;
	links.length = 0;
	selectedObject = null;
	commitHistory();
	draw();
}

function performUndo() {
	flushHistory();
	var snap = History.undo();
	if (snap == null) return;
	loadSnapshotJSON(snap);
	saveBackup();
	draw();
}

function performRedo() {
	flushHistory();
	var snap = History.redo();
	if (snap == null) return;
	loadSnapshotJSON(snap);
	saveBackup();
	draw();
}

function isEditableTarget(target) {
	if (!target) return false;
	var tag = target.tagName;
	if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable)
		return true;
	return false;
}

document.onkeydown = function (e) {
	var key = crossBrowserKey(e);
	var meta = e.metaKey || e.ctrlKey;
	var target = e.target || e.srcElement;

	// Global shortcuts (work regardless of focus, except in editable fields).
	if (meta && !isEditableTarget(target)) {
		if (key === 90 || key === 122) {
			// Z / z
			if (e.shiftKey) performRedo();
			else performUndo();
			e.preventDefault();
			return false;
		}
		if (key === 89 || key === 121) {
			// Y / y
			performRedo();
			e.preventDefault();
			return false;
		}
	}

	if (key == 16) {
		shift = true;
	} else if (!canvasHasFocus()) {
		// don't read keystrokes when other things have focus
		return true;
	} else if (key === 9) {
		// Tab cycles within the canvas only while there's something to cycle.
		// Past the boundary of the order, we deselect and let the browser move
		// focus normally so the canvas isn't a keyboard trap.
		if (linkMode) {
			cycleKeyboardLinkTarget(e.shiftKey ? -1 : 1);
			e.preventDefault();
			return false;
		}
		var order = selectionOrder();
		if (!order.length || selectedObject == null) {
			return true;
		}
		var idx = order.indexOf(selectedObject);
		var next = idx + (e.shiftKey ? -1 : 1);
		if (idx === -1 || next < 0 || next >= order.length) {
			selectedObject = null;
			draw();
			return true;
		}
		selectedObject = order[next];
		resetCaret();
		draw();
		e.preventDefault();
		return false;
	} else if (key === 27) {
		// Escape
		if (linkMode) cancelKeyboardLink();
		else {
			selectedObject = null;
			draw();
		}
		e.preventDefault();
		return false;
	} else if (key === 13) {
		// Enter: confirm a keyboard-built link, otherwise no-op.
		if (linkMode) {
			confirmKeyboardLink();
			e.preventDefault();
			return false;
		}
	} else if (key >= 37 && key <= 40 && !meta) {
		// Arrows nudge the selected node. Shift -> 1px, otherwise 5px.
		var step = e.shiftKey ? 1 : 5;
		var dx = 0,
			dy = 0;
		if (key === 37) dx = -step;
		else if (key === 39) dx = step;
		else if (key === 38) dy = -step;
		else dy = step;
		nudgeSelected(dx, dy);
		e.preventDefault();
		return false;
	} else if (
		key === 78 &&
		!meta &&
		!e.shiftKey &&
		!e.altKey &&
		selectedObject == null
	) {
		// N: create a state at viewport center. Only fires when no element is
		// selected so it doesn't fight typing 'n' into a label.
		createNodeAtCenter();
		e.preventDefault();
		return false;
	} else if (
		key === 76 &&
		!meta &&
		!e.shiftKey &&
		!e.altKey &&
		selectedObject instanceof Node
	) {
		// L: start a keyboard-driven link from the selected node.
		startKeyboardLink();
		e.preventDefault();
		return false;
	} else if (key == 8) {
		// from upstream PR #25: bare backspace on an empty-label selection deletes
		// the element. PR #25's keydown had two backspace branches and the second
		// was unreachable; keep this as one branch driven by whether text is empty.
		if (meta || (selectedObject != null && !selectedObject.text)) {
			deleteSelected();
		} else if (selectedObject != null) {
			selectedObject.text = selectedObject.text.substr(
				0,
				selectedObject.text.length - 1,
			);
			resetCaret();
			draw();
			commitHistoryDebounced();
		}

		// suppress the browser back-nav default regardless of which branch ran
		return false;
	} else if (key == 46) {
		// delete key
		deleteSelected();
	}
};

document.onkeyup = function (e) {
	var key = crossBrowserKey(e);

	if (key == 16) {
		shift = false;
	}
};

document.onkeypress = function (e) {
	// don't read keystrokes when other things have focus
	var key = crossBrowserKey(e);
	if (!canvasHasFocus()) {
		// don't read keystrokes when other things have focus
		return true;
	} else if (
		key >= 0x20 &&
		key <= 0x7e &&
		!e.metaKey &&
		!e.altKey &&
		!e.ctrlKey &&
		selectedObject != null &&
		'text' in selectedObject
	) {
		selectedObject.text += String.fromCharCode(key);
		resetCaret();
		draw();
		commitHistoryDebounced();

		// don't let keys do their actions (like space scrolls down the page)
		return false;
	} else if (key == 8) {
		// backspace is a shortcut for the back button, but do NOT want to change pages
		return false;
	}
};

function crossBrowserKey(e) {
	e = e || window.event;
	return e.which || e.keyCode;
}

function crossBrowserRelativeMousePos(e) {
	// from upstream PR #44: use getBoundingClientRect so coords stay correct when
	// the canvas is CSS-scaled (width:100%, responsive layout, mobile zoom).
	var rect = canvas.getBoundingClientRect();
	var sx = rect.width ? canvas.width / rect.width : 1;
	var sy = rect.height ? canvas.height / rect.height : 1;
	return {
		x: (e.clientX - rect.left) * sx,
		y: (e.clientY - rect.top) * sy,
	};
}

function saveAsPNG() {
	// from upstream PR #34: route via downloadDataURL so Chromium fires the save dialog
	// instead of navigating to the data: URL (which the old `location.href = pngData` did).
	var prev = selectedObject;
	selectedObject = null;
	drawUsing(canvas.getContext('2d'), EXPORT_COLORS);
	selectedObject = prev;
	var pngData = canvas.toDataURL('image/png');
	draw();
	var ok = downloadDataURL(activeFSMFileName('png'), pngData);
	if (ok) showToast('PNG downloaded');
	else showToast('Could not download PNG', 'error');
}

function saveAsSVG() {
	var exporter = new ExportAsSVG();
	var oldSelectedObject = selectedObject;
	selectedObject = null;
	drawUsing(exporter, EXPORT_COLORS);
	selectedObject = oldSelectedObject;
	var svgData = exporter.toSVG();
	var ok = downloadBlob(
		activeFSMFileName('svg'),
		svgData,
		'image/svg+xml;charset=utf-8',
	);
	if (ok) showToast('SVG downloaded');
	else showToast('Could not download SVG', 'error');
}

function saveAsLaTeX() {
	var exporter = new ExportAsLaTeX();
	var oldSelectedObject = selectedObject;
	selectedObject = null;
	drawUsing(exporter, EXPORT_COLORS);
	selectedObject = oldSelectedObject;
	// from upstream PR #23: read the user's standalone-vs-snippet preference
	// at export time so changes take effect without a reload.
	var modeEl = document.getElementById('latex-mode');
	var mode = modeEl ? modeEl.value : 'standalone';
	var texData = exporter.toLaTeX(mode);
	Promise.resolve(copyToClipboard(texData)).then(function (ok) {
		if (ok) showToast('LaTeX copied to clipboard');
		else showToast('Could not copy - clipboard blocked', 'error');
	});
}

// History: snapshot-based undo/redo stack for the active FSM.
// Snapshots are JSON strings produced by snapshotJSON()/loadSnapshotJSON() in save.js.

var History = (function () {
	var stack = [];
	var index = -1;
	var LIMIT = 100;
	var listeners = [];

	function notify() {
		for (var i = 0; i < listeners.length; i++) {
			try {
				listeners[i]();
			} catch (e) {}
		}
	}

	return {
		push: function (snapshot) {
			// dedupe consecutive identical states
			if (index >= 0 && stack[index] === snapshot) return;
			// drop redo tail
			if (index < stack.length - 1) {
				stack.length = index + 1;
			}
			stack.push(snapshot);
			if (stack.length > LIMIT) {
				stack.shift();
			}
			index = stack.length - 1;
			notify();
		},
		reset: function (snapshot) {
			stack = snapshot != null ? [snapshot] : [];
			index = stack.length - 1;
			notify();
		},
		undo: function () {
			if (index <= 0) return null;
			index--;
			notify();
			return stack[index];
		},
		redo: function () {
			if (index >= stack.length - 1) return null;
			index++;
			notify();
			return stack[index];
		},
		canUndo: function () {
			return index > 0;
		},
		canRedo: function () {
			return index < stack.length - 1;
		},
		onChange: function (fn) {
			listeners.push(fn);
		},
	};
})();

// I/O helpers: toast notifications, clipboard, file downloads.

var __toastTimer = null;
function showToast(message, kind) {
	var el = document.getElementById('toast');
	if (!el) return;
	el.textContent = message;
	el.className = 'toast show' + (kind ? ' toast-' + kind : '');
	if (__toastTimer) clearTimeout(__toastTimer);
	__toastTimer = setTimeout(function () {
		el.className = 'toast' + (kind ? ' toast-' + kind : '');
	}, 2200);
}

function copyToClipboard(text) {
	function fallback() {
		try {
			var ta = document.createElement('textarea');
			ta.value = text;
			ta.setAttribute('readonly', '');
			ta.style.position = 'fixed';
			ta.style.left = '-9999px';
			ta.style.top = '0';
			document.body.appendChild(ta);
			ta.select();
			ta.setSelectionRange(0, text.length);
			var ok = document.execCommand('copy');
			document.body.removeChild(ta);
			return ok;
		} catch (e) {
			return false;
		}
	}
	if (navigator.clipboard && navigator.clipboard.writeText) {
		return navigator.clipboard.writeText(text).then(
			function () {
				return true;
			},
			function () {
				return fallback();
			},
		);
	}
	return Promise.resolve(fallback());
}

function downloadBlob(filename, content, mime) {
	try {
		var blob = new Blob([content], {
			type: mime || 'application/octet-stream',
		});
		var url = URL.createObjectURL(blob);
		var a = document.createElement('a');
		a.href = url;
		a.download = filename;
		a.style.display = 'none';
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		setTimeout(function () {
			URL.revokeObjectURL(url);
		}, 1500);
		return true;
	} catch (e) {
		return false;
	}
}

function downloadDataURL(filename, dataURL) {
	try {
		var a = document.createElement('a');
		a.href = dataURL;
		a.download = filename;
		a.style.display = 'none';
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		return true;
	} catch (e) {
		return false;
	}
}

function safeFileName(name, ext) {
	var base = (name || 'fsm').replace(/[^A-Za-z0-9._\-؀-ۿݐ-ݿ]+/g, '_');
	if (!base) base = 'fsm';
	return base + '.' + ext;
}

function activeFSMFileName(ext) {
	var name = 'fsm';
	try {
		if (typeof Workspace !== 'undefined') {
			var active = Workspace.getActive();
			if (active && active.name) name = active.name;
		}
	} catch (e) {}
	return safeFileName(name, ext);
}

// Sugiyama-style layered layout. BFS from the start state assigns each node
// a layer index; nodes inside a layer are spaced evenly. Back-edges (target
// layer <= source layer) get a perpendicular bow so they don't cross through
// the source node.

var LAYOUT_MARGIN_X = 110;
var LAYOUT_MARGIN_Y = 80;
var LAYOUT_STEP_X = 170;
var LAYOUT_STEP_Y = 110;

function layout(nodes, links) {
	if (!nodes.length) return;

	var start = -1;
	for (var i = 0; i < links.length; i++) {
		if (links[i] instanceof StartLink) {
			var idx = nodes.indexOf(links[i].node);
			if (idx !== -1) {
				start = idx;
				break;
			}
		}
	}
	if (start === -1) start = 0;

	var layer = new Array(nodes.length);
	for (var z = 0; z < nodes.length; z++) layer[z] = -1;
	layer[start] = 0;
	var queue = [start];
	while (queue.length) {
		var u = queue.shift();
		var outs = getOutgoing(u, nodes, links);
		for (var k = 0; k < outs.length; k++) {
			if (layer[outs[k].target] === -1) {
				layer[outs[k].target] = layer[u] + 1;
				queue.push(outs[k].target);
			}
		}
	}
	// Park unreachable nodes one layer past the farthest reachable one.
	var maxL = 0;
	for (var n = 0; n < nodes.length; n++) {
		if (layer[n] > maxL) maxL = layer[n];
	}
	for (var n = 0; n < nodes.length; n++) {
		if (layer[n] === -1) layer[n] = maxL + 1;
	}

	var byLayer = {};
	for (var i = 0; i < nodes.length; i++) {
		if (!byLayer[layer[i]]) byLayer[layer[i]] = [];
		byLayer[layer[i]].push(i);
	}
	var layerKeys = Object.keys(byLayer)
		.map(Number)
		.sort(function (a, b) {
			return a - b;
		});

	for (var l = 0; l < layerKeys.length; l++) {
		var members = byLayer[layerKeys[l]];
		var rowHeight = (members.length - 1) * LAYOUT_STEP_Y;
		// Centre each layer's column vertically around the canvas mid line.
		var yOffset = 240 - rowHeight / 2;
		for (var m = 0; m < members.length; m++) {
			nodes[members[m]].x = LAYOUT_MARGIN_X + l * LAYOUT_STEP_X;
			nodes[members[m]].y = LAYOUT_MARGIN_Y + yOffset + m * LAYOUT_STEP_Y;
		}
	}

	for (var li = 0; li < links.length; li++) {
		var lk = links[li];
		if (!(lk instanceof Link)) continue;
		var a = nodes.indexOf(lk.nodeA);
		var b = nodes.indexOf(lk.nodeB);
		if (a === -1 || b === -1) continue;
		if (layer[b] <= layer[a] && b !== a) {
			// back-edge: bow upward so the arrow stays clear of the row.
			lk.perpendicularPart = -50;
			lk.parallelPart = 0.5;
			lk.lineAngleAdjust = 0;
		} else {
			lk.perpendicularPart = 0;
			lk.parallelPart = 0.5;
			lk.lineAngleAdjust = 0;
		}
	}

	for (var sl = 0; sl < links.length; sl++) {
		var L = links[sl];
		if (L instanceof StartLink) {
			L.deltaX = -50;
			L.deltaY = 0;
		} else if (L instanceof SelfLink) {
			L.anchorAngle = -Math.PI / 2;
		}
	}
}

// Diagram-level checks. Pure over (nodes, links); the UI decides what to show.

var LINT_KINDS = [
	{ id: 'no_start', label: 'No start state', severity: 'error' },
	{ id: 'multi_start', label: 'Multiple start states', severity: 'error' },
	{ id: 'no_accept', label: 'No accept state', severity: 'warning' },
	{ id: 'nondet', label: 'Nondeterministic transitions', severity: 'warning' },
	{ id: 'missing', label: 'Missing transitions', severity: 'warning' },
	{ id: 'unreachable', label: 'Unreachable states', severity: 'info' },
];

function lint(nodes, links) {
	var out = [];
	var starts = getStartStates(nodes, links);

	if (starts.length === 0) {
		out.push({
			kind: 'no_start',
			severity: 'error',
			element: null,
			message: 'no start state',
		});
	} else if (starts.length > 1) {
		for (var i = 0; i < links.length; i++) {
			if (links[i] instanceof StartLink) {
				out.push({
					kind: 'multi_start',
					severity: 'error',
					element: links[i],
					message: 'multiple start states',
				});
			}
		}
	}

	var hasAccept = false;
	for (var n = 0; n < nodes.length; n++) {
		if (nodes[n].isAcceptState) {
			hasAccept = true;
			break;
		}
	}
	if (!hasAccept) {
		out.push({
			kind: 'no_accept',
			severity: 'warning',
			element: null,
			message: 'no accept state',
		});
	}

	var alphabet = {};
	for (var li = 0; li < links.length; li++) {
		var l = links[li];
		if (!(l instanceof Link) && !(l instanceof SelfLink)) continue;
		var syms = parseSymbols(l.text);
		for (var k = 0; k < syms.length; k++) {
			if (syms[k] !== '') alphabet[syms[k]] = true;
		}
	}
	var alphabetList = Object.keys(alphabet);

	for (var ni = 0; ni < nodes.length; ni++) {
		var counts = {};
		var seen = {};
		for (var lj = 0; lj < links.length; lj++) {
			var lk = links[lj];
			var matches =
				(lk instanceof SelfLink && lk.node === nodes[ni]) ||
				(lk instanceof Link && lk.nodeA === nodes[ni]);
			if (!matches) continue;
			var sx = parseSymbols(lk.text);
			for (var s = 0; s < sx.length; s++) {
				var sym = sx[s];
				if (sym !== '') seen[sym] = true;
				counts[sym] = (counts[sym] || 0) + 1;
				if (counts[sym] === 2) {
					out.push({
						kind: 'nondet',
						severity: 'warning',
						element: nodes[ni],
						message:
							'nondeterministic on ' +
							(sym === '' ? 'epsilon' : JSON.stringify(sym)),
					});
				}
			}
		}
		for (var a = 0; a < alphabetList.length; a++) {
			if (!seen[alphabetList[a]]) {
				out.push({
					kind: 'missing',
					severity: 'warning',
					element: nodes[ni],
					message: 'missing transition for ' + JSON.stringify(alphabetList[a]),
				});
			}
		}
	}

	if (starts.length > 0) {
		var reach = {};
		var queue = starts.slice();
		for (var q = 0; q < queue.length; q++) reach[queue[q]] = true;
		while (queue.length) {
			var s = queue.shift();
			var outs = getOutgoing(s, nodes, links);
			for (var u = 0; u < outs.length; u++) {
				if (!reach[outs[u].target]) {
					reach[outs[u].target] = true;
					queue.push(outs[u].target);
				}
			}
		}
		for (var nj = 0; nj < nodes.length; nj++) {
			if (!reach[nj]) {
				out.push({
					kind: 'unreachable',
					severity: 'info',
					element: nodes[nj],
					message: 'unreachable from start',
				});
			}
		}
	}

	return out;
}

function lintEnabledFor(kind) {
	try {
		return localStorage.getItem('fsm_lint_off_' + kind) !== '1';
	} catch (e) {
		return true;
	}
}

function setLintEnabled(kind, on) {
	try {
		if (on) localStorage.removeItem('fsm_lint_off_' + kind);
		else localStorage.setItem('fsm_lint_off_' + kind, '1');
	} catch (e) {}
}

function det(a, b, c, d, e, f, g, h, i) {
	return a * e * i + b * f * g + c * d * h - a * f * h - b * d * i - c * e * g;
}

function circleFromThreePoints(x1, y1, x2, y2, x3, y3) {
	var a = det(x1, y1, 1, x2, y2, 1, x3, y3, 1);
	var bx = -det(
		x1 * x1 + y1 * y1,
		y1,
		1,
		x2 * x2 + y2 * y2,
		y2,
		1,
		x3 * x3 + y3 * y3,
		y3,
		1,
	);
	var by = det(
		x1 * x1 + y1 * y1,
		x1,
		1,
		x2 * x2 + y2 * y2,
		x2,
		1,
		x3 * x3 + y3 * y3,
		x3,
		1,
	);
	var c = -det(
		x1 * x1 + y1 * y1,
		x1,
		y1,
		x2 * x2 + y2 * y2,
		x2,
		y2,
		x3 * x3 + y3 * y3,
		x3,
		y3,
	);
	return {
		x: -bx / (2 * a),
		y: -by / (2 * a),
		radius: Math.sqrt(bx * bx + by * by - 4 * a * c) / (2 * Math.abs(a)),
	};
}

function fixed(number, digits) {
	return number.toFixed(digits).replace(/0+$/, '').replace(/\.$/, '');
}

// DFA minimization via partition refinement (Moore's). For our typical sizes
// the n^2 inner loop is fine; if it ever bites we'd switch to Hopcroft.
//
// Steps:
//   1. Inflate the input as a DFA. Reject NFA-shaped inputs (nondeterministic
//      transitions, epsilon edges).
//   2. Initial partition = { accept states, non-accept states }.
//   3. Refine: two states are equivalent iff for every symbol c their
//      transitions land in the same partition. Keep splitting until stable.

function minimize(dfaJson) {
	var dfa = inflateFSM(dfaJson);
	var nodes = dfa.nodes;
	var links = dfa.links;
	var n = nodes.length;
	if (!n) return { format: SAVE_FORMAT, nodes: [], links: [] };

	var alphabet = fsmAlphabet(nodes, links);

	// Transition table indexed by [stateIdx][symbol]. Missing entries are -1.
	var trans = [];
	for (var i = 0; i < n; i++) trans.push({});
	for (var li = 0; li < links.length; li++) {
		var l = links[li];
		var src, dst;
		if (l instanceof Link) {
			src = nodes.indexOf(l.nodeA);
			dst = nodes.indexOf(l.nodeB);
		} else if (l instanceof SelfLink) {
			src = nodes.indexOf(l.node);
			dst = src;
		} else {
			continue;
		}
		var syms = parseSymbols(l.text);
		for (var k = 0; k < syms.length; k++) {
			var s = syms[k];
			if (s === '') {
				throw new Error('minimize requires a DFA; found an epsilon edge');
			}
			if (trans[src][s] !== undefined && trans[src][s] !== dst) {
				throw new Error(
					'minimize requires a DFA; state ' +
						src +
						' has two targets on ' +
						JSON.stringify(s),
				);
			}
			trans[src][s] = dst;
		}
	}

	var hasAccept = false;
	for (var i = 0; i < n; i++) if (nodes[i].isAcceptState) hasAccept = true;

	var partition = new Array(n);
	for (var i = 0; i < n; i++) {
		partition[i] = nodes[i].isAcceptState && hasAccept ? 1 : 0;
	}
	var numClasses = hasAccept ? 2 : 1;

	while (true) {
		var classOf = {};
		var nextClass = 0;
		var nextPartition = new Array(n);
		for (var i = 0; i < n; i++) {
			var sig = partition[i] + '|';
			for (var a = 0; a < alphabet.length; a++) {
				var t = trans[i][alphabet[a]];
				sig += (t === undefined ? '-' : partition[t]) + ',';
			}
			if (!(sig in classOf)) classOf[sig] = nextClass++;
			nextPartition[i] = classOf[sig];
		}
		if (nextClass === numClasses) {
			var same = true;
			for (var i = 0; i < n; i++) {
				if (nextPartition[i] !== partition[i]) {
					same = false;
					break;
				}
			}
			if (same) break;
		}
		partition = nextPartition;
		numClasses = nextClass;
	}

	var rep = {};
	for (var i = 0; i < n; i++) {
		if (rep[partition[i]] === undefined) rep[partition[i]] = i;
	}
	var starts = getStartStates(nodes, links);
	if (!starts.length) throw new Error('no start state to minimize from');

	var json = { format: SAVE_FORMAT, nodes: [], links: [] };
	for (var p = 0; p < numClasses; p++) {
		var r = rep[p];
		json.nodes.push({
			x: 0,
			y: 0,
			text: 'd' + p,
			isAcceptState: nodes[r].isAcceptState,
		});
	}
	json.links.push({
		type: 'StartLink',
		node: partition[starts[0]],
		text: '',
		deltaX: -50,
		deltaY: 0,
	});

	var grouped = {};
	for (var p = 0; p < numClasses; p++) {
		var r = rep[p];
		for (var a = 0; a < alphabet.length; a++) {
			var sym = alphabet[a];
			var t = trans[r][sym];
			if (t === undefined) continue;
			var to = partition[t];
			var gk = p + ',' + to;
			if (!grouped[gk]) grouped[gk] = { from: p, to: to, syms: [] };
			grouped[gk].syms.push(sym);
		}
	}
	for (var gk in grouped) {
		var g = grouped[gk];
		var label = g.syms.join(',');
		if (g.from === g.to) {
			json.links.push({
				type: 'SelfLink',
				node: g.from,
				text: label,
				anchorAngle: -Math.PI / 2,
			});
		} else {
			json.links.push({
				type: 'Link',
				nodeA: g.from,
				nodeB: g.to,
				text: label,
				lineAngleAdjust: 0,
				parallelPart: 0.5,
				perpendicularPart: 0,
			});
		}
	}
	return json;
}

// Subset construction. Takes an FSM JSON, returns a DFA JSON without
// coordinates (layout() positions them later).

function fsmAlphabet(nodes, links) {
	var set = {};
	for (var i = 0; i < links.length; i++) {
		var l = links[i];
		if (!(l instanceof Link) && !(l instanceof SelfLink)) continue;
		var syms = parseSymbols(l.text);
		for (var k = 0; k < syms.length; k++) {
			if (syms[k] !== '') set[syms[k]] = true;
		}
	}
	return Object.keys(set).sort();
}

function nfaToDFA(nfaJson) {
	var nfa = inflateFSM(nfaJson);
	var starts = getStartStates(nfa.nodes, nfa.links);
	if (starts.length !== 1) {
		throw new Error(
			'subset construction expects exactly one start state (got ' +
				starts.length +
				')',
		);
	}
	var alphabet = fsmAlphabet(nfa.nodes, nfa.links);
	var startClosure = epsilonClosure([starts[0]], nfa.nodes, nfa.links);

	function key(set) {
		return set
			.slice()
			.sort(function (a, b) {
				return a - b;
			})
			.join(',');
	}
	function isAccept(set) {
		for (var i = 0; i < set.length; i++) {
			if (nfa.nodes[set[i]].isAcceptState) return true;
		}
		return false;
	}

	var seen = {};
	var dfaStates = [];
	var dfaTransitions = [];

	function addState(set) {
		var k = key(set);
		if (k in seen) return seen[k];
		var idx = dfaStates.length;
		seen[k] = idx;
		dfaStates.push({ members: set, accept: isAccept(set) });
		return idx;
	}

	var startIdx = addState(startClosure);
	var queue = [startIdx];
	while (queue.length) {
		var s = queue.shift();
		var subset = dfaStates[s].members;
		for (var a = 0; a < alphabet.length; a++) {
			var sym = alphabet[a];
			var step = simulateStep(subset, sym, nfa.nodes, nfa.links);
			if (!step.states.length) continue;
			var k = key(step.states);
			var to;
			if (k in seen) {
				to = seen[k];
			} else {
				to = addState(step.states);
				queue.push(to);
			}
			dfaTransitions.push({ from: s, to: to, symbol: sym });
		}
	}

	var json = { format: SAVE_FORMAT, nodes: [], links: [] };
	for (var i = 0; i < dfaStates.length; i++) {
		json.nodes.push({
			x: 0,
			y: 0,
			text: 'd' + i,
			isAcceptState: dfaStates[i].accept,
		});
	}
	json.links.push({
		type: 'StartLink',
		node: startIdx,
		text: '',
		deltaX: -50,
		deltaY: 0,
	});

	// Combine multiple symbols between the same pair into one link with a
	// comma-separated label (matches what simulate.js parses).
	var grouped = {};
	for (var t = 0; t < dfaTransitions.length; t++) {
		var tr = dfaTransitions[t];
		var gk = tr.from + ',' + tr.to;
		if (!grouped[gk]) grouped[gk] = { from: tr.from, to: tr.to, syms: [] };
		grouped[gk].syms.push(tr.symbol);
	}
	for (var gk in grouped) {
		var g = grouped[gk];
		var label = g.syms.join(',');
		if (g.from === g.to) {
			json.links.push({
				type: 'SelfLink',
				node: g.from,
				text: label,
				anchorAngle: -Math.PI / 2,
			});
		} else {
			json.links.push({
				type: 'Link',
				nodeA: g.from,
				nodeB: g.to,
				text: label,
				lineAngleAdjust: 0,
				parallelPart: 0.5,
				perpendicularPart: 0,
			});
		}
	}
	return json;
}

// Natural-language helpers: turn a plain-English description into FSM JSON,
// or describe the current FSM in plain English. Talks to a remote model
// endpoint; the user supplies the key.
//
// The key lives in localStorage under fsm_model_key. This is a deliberate
// trade-off: the app works without a backend, but anyone with access to the
// browser can read the key, and embedding it in a share URL would leak it.
// The UI surfaces that warning near the key input.

var MODEL_KEY_STORAGE = 'fsm_model_key';
var MODEL_NAME = 'claude-haiku-4-5';
var MODEL_ENDPOINT = 'https://api.anthropic.com/v1/messages';

function getModelKey() {
	try {
		return localStorage.getItem(MODEL_KEY_STORAGE) || '';
	} catch (e) {
		return '';
	}
}

function setModelKey(k) {
	try {
		if (k) localStorage.setItem(MODEL_KEY_STORAGE, k);
		else localStorage.removeItem(MODEL_KEY_STORAGE);
	} catch (e) {}
}

var SYSTEM_GENERATE =
	'You are an FSM-design helper for an automata theory tool.\n' +
	'Output ONLY a single JSON object that conforms to this schema:\n' +
	'{\n' +
	'  "format": "fsmStudio.v1",\n' +
	'  "nodes": [{"x":0,"y":0,"text":"q0","isAcceptState":false}, ...],\n' +
	'  "links": [\n' +
	'    {"type":"StartLink","node":<idx>,"text":"","deltaX":-50,"deltaY":0},\n' +
	'    {"type":"Link","nodeA":<src>,"nodeB":<dst>,"text":"<sym>","lineAngleAdjust":0,"parallelPart":0.5,"perpendicularPart":0},\n' +
	'    {"type":"SelfLink","node":<idx>,"text":"<sym>","anchorAngle":0}\n' +
	'  ]\n' +
	'}\n' +
	'Rules:\n' +
	'- Exactly one StartLink.\n' +
	'- "text" on a transition is one symbol or comma-separated symbols ("a,b").\n' +
	'- An empty text on a Link/SelfLink is an epsilon transition.\n' +
	'- Always set node x=0, y=0; layout is computed by the editor.\n' +
	'- Do NOT wrap the JSON in markdown fences. Do NOT include any prose.\n' +
	'\n' +
	'Examples follow.\n' +
	'\n' +
	'# DFA accepting binary strings with at least one 1\n' +
	'{"format":"fsmStudio.v1","nodes":[{"x":0,"y":0,"text":"q0","isAcceptState":false},{"x":0,"y":0,"text":"q1","isAcceptState":true}],"links":[{"type":"StartLink","node":0,"text":"","deltaX":-50,"deltaY":0},{"type":"SelfLink","node":0,"text":"0","anchorAngle":0},{"type":"Link","nodeA":0,"nodeB":1,"text":"1","lineAngleAdjust":0,"parallelPart":0.5,"perpendicularPart":0},{"type":"SelfLink","node":1,"text":"0,1","anchorAngle":0}]}\n' +
	'\n' +
	'# DFA over {a} that accepts strings of even length\n' +
	'{"format":"fsmStudio.v1","nodes":[{"x":0,"y":0,"text":"even","isAcceptState":true},{"x":0,"y":0,"text":"odd","isAcceptState":false}],"links":[{"type":"StartLink","node":0,"text":"","deltaX":-50,"deltaY":0},{"type":"Link","nodeA":0,"nodeB":1,"text":"a","lineAngleAdjust":0,"parallelPart":0.5,"perpendicularPart":0},{"type":"Link","nodeA":1,"nodeB":0,"text":"a","lineAngleAdjust":0,"parallelPart":0.5,"perpendicularPart":0}]}\n' +
	'\n' +
	'# DFA over {0,1} for strings ending with "01"\n' +
	'{"format":"fsmStudio.v1","nodes":[{"x":0,"y":0,"text":"q0","isAcceptState":false},{"x":0,"y":0,"text":"q1","isAcceptState":false},{"x":0,"y":0,"text":"q2","isAcceptState":true}],"links":[{"type":"StartLink","node":0,"text":"","deltaX":-50,"deltaY":0},{"type":"SelfLink","node":0,"text":"1","anchorAngle":0},{"type":"Link","nodeA":0,"nodeB":1,"text":"0","lineAngleAdjust":0,"parallelPart":0.5,"perpendicularPart":0},{"type":"SelfLink","node":1,"text":"0","anchorAngle":0},{"type":"Link","nodeA":1,"nodeB":2,"text":"1","lineAngleAdjust":0,"parallelPart":0.5,"perpendicularPart":0},{"type":"Link","nodeA":2,"nodeB":0,"text":"1","lineAngleAdjust":0,"parallelPart":0.5,"perpendicularPart":0},{"type":"Link","nodeA":2,"nodeB":1,"text":"0","lineAngleAdjust":0,"parallelPart":0.5,"perpendicularPart":0}]}\n' +
	'\n' +
	'# NFA accepting strings containing "ab"\n' +
	'{"format":"fsmStudio.v1","nodes":[{"x":0,"y":0,"text":"q0","isAcceptState":false},{"x":0,"y":0,"text":"q1","isAcceptState":false},{"x":0,"y":0,"text":"q2","isAcceptState":true}],"links":[{"type":"StartLink","node":0,"text":"","deltaX":-50,"deltaY":0},{"type":"SelfLink","node":0,"text":"a,b","anchorAngle":0},{"type":"Link","nodeA":0,"nodeB":1,"text":"a","lineAngleAdjust":0,"parallelPart":0.5,"perpendicularPart":0},{"type":"Link","nodeA":1,"nodeB":2,"text":"b","lineAngleAdjust":0,"parallelPart":0.5,"perpendicularPart":0},{"type":"SelfLink","node":2,"text":"a,b","anchorAngle":0}]}\n';

var SYSTEM_DESCRIBE =
	'You are an automata theory tutor. Given an FSM in fsmStudio.v1 JSON, ' +
	'describe in plain English what language it accepts. Be concise: 2-3 ' +
	'sentences, no JSON, no markdown.';

function callModel(system, userMsg, apiKey) {
	return fetch(MODEL_ENDPOINT, {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			'x-api-key': apiKey,
			'anthropic-version': '2023-06-01',
			'anthropic-dangerous-direct-browser-access': 'true',
		},
		body: JSON.stringify({
			model: MODEL_NAME,
			max_tokens: 2000,
			system: system,
			messages: [{ role: 'user', content: userMsg }],
		}),
	}).then(function (resp) {
		return resp.json().then(function (data) {
			if (!resp.ok) {
				var msg =
					data && data.error && data.error.message
						? data.error.message
						: 'API error ' + resp.status;
				throw new Error(msg);
			}
			if (!data.content || !data.content[0] || !data.content[0].text) {
				throw new Error('empty response');
			}
			return data.content[0].text;
		});
	});
}

function parseModelJSON(text) {
	try {
		return JSON.parse(text);
	} catch (e) {
		// Some replies wrap the JSON in prose or markdown fences; pull out
		// the outermost brace-balanced region and try again.
		var stripped = text
			.replace(/^[^{]*?(?=\{)/, '')
			.replace(/[^}]*$/, '')
			.trim();
		return JSON.parse(stripped);
	}
}

function generateFSMFromText(description) {
	var key = getModelKey();
	if (!key) return Promise.reject(new Error('no API key configured'));
	return callModel(SYSTEM_GENERATE, description, key).then(function (text) {
		var json = parseModelJSON(text);
		var err = validateSnapshot(json);
		if (err) throw new Error('model returned invalid JSON: ' + err);
		return json;
	});
}

function describeFSM(json) {
	var key = getModelKey();
	if (!key) return Promise.reject(new Error('no API key configured'));
	return callModel(SYSTEM_DESCRIBE, JSON.stringify(json), key);
}

// Recursive-descent regex parser + Thompson construction.
// Grammar:
//   expr   = term ('|' term)*
//   term   = factor*
//   factor = atom ('*' | '+' | '?')?
//   atom   = '(' expr ')' | literal
// '(' ')' is an explicit epsilon. There is no escape syntax for v1 -- the
// special characters |*+?() can't appear as literals.

function parseRegex(input) {
	var pos = 0;
	var SPECIAL = '|*+?()';

	function peek() {
		return pos < input.length ? input.charAt(pos) : null;
	}
	function eat(c) {
		if (peek() === c) {
			pos++;
			return true;
		}
		return false;
	}

	function expr() {
		var first = term();
		if (peek() !== '|') return first;
		var arr = [first];
		while (eat('|')) arr.push(term());
		return { type: 'union', children: arr };
	}

	function term() {
		var arr = [];
		while (peek() != null && peek() !== '|' && peek() !== ')') {
			arr.push(factor());
		}
		if (!arr.length) return { type: 'eps' };
		if (arr.length === 1) return arr[0];
		return { type: 'concat', children: arr };
	}

	function factor() {
		var a = atom();
		while (true) {
			if (eat('*')) a = { type: 'star', child: a };
			else if (eat('+')) a = { type: 'plus', child: a };
			else if (eat('?')) a = { type: 'opt', child: a };
			else break;
		}
		return a;
	}

	function atom() {
		if (eat('(')) {
			var inner = expr();
			if (!eat(')')) {
				throw new Error('expected ) at position ' + pos);
			}
			return inner;
		}
		var c = peek();
		if (c == null || SPECIAL.indexOf(c) !== -1) {
			throw new Error(
				'unexpected ' + JSON.stringify(c) + ' at position ' + pos,
			);
		}
		pos++;
		return { type: 'lit', value: c };
	}

	var tree = expr();
	if (pos < input.length) {
		throw new Error(
			'unexpected ' + JSON.stringify(peek()) + ' at position ' + pos,
		);
	}
	return tree;
}

function thompson(ast) {
	var states = [];
	var trans = [];
	function newState() {
		states.push({});
		return states.length - 1;
	}
	function add(from, to, sym) {
		trans.push({ from: from, to: to, symbol: sym });
	}

	function build(node) {
		if (node.type === 'eps') {
			var s = newState(),
				e = newState();
			add(s, e, '');
			return { s: s, e: e };
		}
		if (node.type === 'lit') {
			var s2 = newState(),
				e2 = newState();
			add(s2, e2, node.value);
			return { s: s2, e: e2 };
		}
		if (node.type === 'concat') {
			if (!node.children.length) return build({ type: 'eps' });
			var first = build(node.children[0]);
			for (var i = 1; i < node.children.length; i++) {
				var next = build(node.children[i]);
				add(first.e, next.s, '');
				first.e = next.e;
			}
			return first;
		}
		if (node.type === 'union') {
			var us = newState(),
				ue = newState();
			for (var k = 0; k < node.children.length; k++) {
				var c = build(node.children[k]);
				add(us, c.s, '');
				add(c.e, ue, '');
			}
			return { s: us, e: ue };
		}
		if (node.type === 'star') {
			var ss = newState(),
				se = newState();
			var inner = build(node.child);
			add(ss, inner.s, '');
			add(ss, se, '');
			add(inner.e, inner.s, '');
			add(inner.e, se, '');
			return { s: ss, e: se };
		}
		if (node.type === 'plus') {
			return build({
				type: 'concat',
				children: [node.child, { type: 'star', child: node.child }],
			});
		}
		if (node.type === 'opt') {
			return build({
				type: 'union',
				children: [node.child, { type: 'eps' }],
			});
		}
		throw new Error('unknown ast node ' + node.type);
	}

	var frag = build(ast);
	return { states: states, trans: trans, start: frag.s, accept: frag.e };
}

function regexToNFA(regex) {
	var ast = parseRegex(regex);
	var nfa = thompson(ast);
	var json = { format: SAVE_FORMAT, nodes: [], links: [] };
	for (var i = 0; i < nfa.states.length; i++) {
		json.nodes.push({
			x: 0,
			y: 0,
			text: 'q' + i,
			isAcceptState: i === nfa.accept,
		});
	}
	json.links.push({
		type: 'StartLink',
		node: nfa.start,
		text: '',
		deltaX: -50,
		deltaY: 0,
	});
	for (var t = 0; t < nfa.trans.length; t++) {
		var tr = nfa.trans[t];
		if (tr.from === tr.to) {
			json.links.push({
				type: 'SelfLink',
				node: tr.from,
				text: tr.symbol,
				anchorAngle: -Math.PI / 2,
			});
		} else {
			json.links.push({
				type: 'Link',
				nodeA: tr.from,
				nodeB: tr.to,
				text: tr.symbol,
				lineAngleAdjust: 0,
				parallelPart: 0.5,
				perpendicularPart: 0,
			});
		}
	}
	return json;
}

// Serialization helpers for the active FSM.
// Reads/writes the active FSM via Workspace. See docs/format.md for the
// import/export envelope.

var SAVE_FORMAT = 'fsmStudio.v1';

function serializeState() {
	var data = { nodes: [], links: [] };
	for (var i = 0; i < nodes.length; i++) {
		var node = nodes[i];
		data.nodes.push({
			x: node.x,
			y: node.y,
			text: node.text,
			isAcceptState: node.isAcceptState,
		});
	}
	for (var i = 0; i < links.length; i++) {
		var link = links[i];
		var backupLink = null;
		if (link instanceof SelfLink) {
			backupLink = {
				type: 'SelfLink',
				node: nodes.indexOf(link.node),
				text: link.text,
				anchorAngle: link.anchorAngle,
			};
		} else if (link instanceof StartLink) {
			backupLink = {
				type: 'StartLink',
				node: nodes.indexOf(link.node),
				text: link.text,
				deltaX: link.deltaX,
				deltaY: link.deltaY,
			};
		} else if (link instanceof Link) {
			backupLink = {
				type: 'Link',
				nodeA: nodes.indexOf(link.nodeA),
				nodeB: nodes.indexOf(link.nodeB),
				text: link.text,
				lineAngleAdjust: link.lineAngleAdjust,
				parallelPart: link.parallelPart,
				perpendicularPart: link.perpendicularPart,
			};
		}
		if (backupLink) data.links.push(backupLink);
	}
	return data;
}

function deserializeState(data) {
	nodes.length = 0;
	links.length = 0;
	selectedObject = null;
	if (!data || !data.nodes) return;
	for (var i = 0; i < data.nodes.length; i++) {
		var bn = data.nodes[i];
		var node = new Node(bn.x, bn.y);
		node.isAcceptState = !!bn.isAcceptState;
		node.text = bn.text || '';
		nodes.push(node);
	}
	for (var i = 0; i < data.links.length; i++) {
		var bl = data.links[i];
		var link = null;
		if (bl.type === 'SelfLink') {
			link = new SelfLink(nodes[bl.node]);
			link.anchorAngle = bl.anchorAngle;
			link.text = bl.text;
		} else if (bl.type === 'StartLink') {
			link = new StartLink(nodes[bl.node]);
			link.deltaX = bl.deltaX;
			link.deltaY = bl.deltaY;
			link.text = bl.text;
		} else if (bl.type === 'Link') {
			link = new Link(nodes[bl.nodeA], nodes[bl.nodeB]);
			link.parallelPart = bl.parallelPart;
			link.perpendicularPart = bl.perpendicularPart;
			link.text = bl.text;
			link.lineAngleAdjust = bl.lineAngleAdjust;
		}
		if (link) links.push(link);
	}
}

function snapshotJSON() {
	return JSON.stringify(serializeState());
}

function loadSnapshotJSON(json) {
	if (!json) return;
	try {
		deserializeState(JSON.parse(json));
	} catch (e) {}
}

function saveBackup() {
	if (typeof localStorage === 'undefined' || !JSON) return;
	if (!Workspace.getActiveId()) return;
	Workspace.saveActive(serializeState());
}

function restoreBackup() {
	if (typeof localStorage === 'undefined' || !JSON) return;
	if (!Workspace.getActiveId()) return;
	deserializeState(Workspace.loadActive());
}

// History commit helpers, defined here so other files can call them after mutations.
var __historyTimer = null;

function commitHistory() {
	if (__historyTimer) {
		clearTimeout(__historyTimer);
		__historyTimer = null;
	}
	saveBackup();
	History.push(snapshotJSON());
}

function commitHistoryDebounced() {
	if (__historyTimer) clearTimeout(__historyTimer);
	saveBackup(); // persist data immediately; only history push is debounced
	__historyTimer = setTimeout(function () {
		History.push(snapshotJSON());
		__historyTimer = null;
	}, 400);
}

function flushHistory() {
	if (__historyTimer) {
		clearTimeout(__historyTimer);
		__historyTimer = null;
		History.push(snapshotJSON());
	}
}

function summarizeFSM(nodes, links) {
	if (!nodes.length) return 'Empty diagram.';
	var startName = null;
	var accepts = [];
	for (var i = 0; i < links.length; i++) {
		if (links[i] instanceof StartLink) {
			var s = nodes.indexOf(links[i].node);
			if (s !== -1) startName = nodes[s].text || 'q' + s;
		}
	}
	for (var k = 0; k < nodes.length; k++) {
		if (nodes[k].isAcceptState) {
			accepts.push(nodes[k].text || 'q' + k);
		}
	}
	var ntrans = 0;
	for (var t = 0; t < links.length; t++) {
		if (links[t] instanceof Link || links[t] instanceof SelfLink) ntrans++;
	}
	var parts = [nodes.length + ' state' + (nodes.length === 1 ? '' : 's')];
	if (startName) parts.push('start ' + startName);
	if (accepts.length) parts.push('accept ' + accepts.join(', '));
	parts.push(ntrans + ' transition' + (ntrans === 1 ? '' : 's'));
	return parts.join('. ') + '.';
}

function exportSnapshot() {
	var s = serializeState();
	return {
		format: SAVE_FORMAT,
		createdAt: new Date().toISOString(),
		nodes: s.nodes,
		links: s.links,
	};
}

// Build live-style Node / Link objects from FSM JSON without touching the
// global nodes / links arrays. Used by the algorithm modules that need to
// reuse simulate.js helpers (getOutgoing, epsilonClosure) on a temporary
// graph.
function inflateFSM(obj) {
	var ns = [];
	if (obj.nodes) {
		for (var i = 0; i < obj.nodes.length; i++) {
			var bn = obj.nodes[i];
			var node = new Node(bn.x, bn.y);
			node.isAcceptState = !!bn.isAcceptState;
			node.text = bn.text || '';
			ns.push(node);
		}
	}
	var ls = [];
	if (obj.links) {
		for (var j = 0; j < obj.links.length; j++) {
			var bl = obj.links[j];
			var link = null;
			if (bl.type === 'SelfLink') {
				link = new SelfLink(ns[bl.node]);
				link.anchorAngle = bl.anchorAngle;
				link.text = bl.text || '';
			} else if (bl.type === 'StartLink') {
				link = new StartLink(ns[bl.node]);
				link.deltaX = bl.deltaX;
				link.deltaY = bl.deltaY;
				link.text = bl.text || '';
			} else if (bl.type === 'Link') {
				link = new Link(ns[bl.nodeA], ns[bl.nodeB]);
				link.parallelPart = bl.parallelPart;
				link.perpendicularPart = bl.perpendicularPart;
				link.text = bl.text || '';
				link.lineAngleAdjust = bl.lineAngleAdjust;
			}
			if (link) ls.push(link);
		}
	}
	return { nodes: ns, links: ls };
}

function validateSnapshot(obj) {
	if (!obj || typeof obj !== 'object') return 'not an object';
	if (obj.format !== SAVE_FORMAT) {
		return 'unexpected format ' + JSON.stringify(obj.format);
	}
	return validateSnapshotShape(obj);
}

// Shared shape check used by both file import (via validateSnapshot) and the
// URL-hash loader (which doesn't carry the format envelope).
function validateSnapshotShape(obj) {
	if (!Array.isArray(obj.nodes)) return 'nodes must be an array';
	if (!Array.isArray(obj.links)) return 'links must be an array';
	for (var i = 0; i < obj.nodes.length; i++) {
		var n = obj.nodes[i];
		if (typeof n.x !== 'number' || typeof n.y !== 'number') {
			return 'node[' + i + '] missing numeric x/y';
		}
	}
	var N = obj.nodes.length;
	function bad(idx) {
		return typeof idx !== 'number' || idx < 0 || idx >= N || (idx | 0) !== idx;
	}
	for (var j = 0; j < obj.links.length; j++) {
		var l = obj.links[j];
		if (l.type === 'Link') {
			if (bad(l.nodeA) || bad(l.nodeB)) {
				return 'link[' + j + '] references a node index outside 0..' + (N - 1);
			}
		} else if (l.type === 'SelfLink' || l.type === 'StartLink') {
			if (bad(l.node)) {
				return 'link[' + j + '] references a node index outside 0..' + (N - 1);
			}
		} else {
			return 'link[' + j + '] unknown type ' + JSON.stringify(l.type);
		}
	}
	return null;
}

// Encode the current diagram into window.location.hash so it can be shared.
//
// Encoding choice: base64-url of UTF-8 JSON, no compression. Measured a sampling
// of small-to-mid FSMs (5-25 states, with labels): JSON is typically 300-1500
// bytes; base64-url adds ~33% (so 400-2000 chars in the URL). Every browser
// allows multi-kilobyte URL fragments, so this fits with room to spare and
// avoids hand-rolled LZ77 that would need its own tests for every edge case.

function shareEncode(json) {
	var bytes = new TextEncoder().encode(json);
	var bin = '';
	for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
	return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function shareDecode(s) {
	var b64 = s.replace(/-/g, '+').replace(/_/g, '/');
	while (b64.length % 4) b64 += '=';
	var bin = atob(b64);
	var bytes = new Uint8Array(bin.length);
	for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
	return new TextDecoder().decode(bytes);
}

function shareURL() {
	var loc = window.location;
	return (
		loc.origin + loc.pathname + loc.search + '#' + shareEncode(snapshotJSON())
	);
}

function copyShareLink() {
	var url = shareURL();
	Promise.resolve(copyToClipboard(url)).then(function (ok) {
		showToast(
			ok ? 'Share link copied' : 'Could not copy link',
			ok ? null : 'error',
		);
	});
}

function maybeLoadFromHash() {
	var hash = window.location.hash.replace(/^#/, '');
	if (!hash) return false;
	// Strip the hash up front so a refused or failed load does not re-prompt
	// on reload. The setattr fallback would navigate, which we don't want.
	try {
		history.replaceState(
			null,
			'',
			window.location.pathname + window.location.search,
		);
	} catch (e) {}
	if (!confirm('Load FSM from URL? This will replace your current diagram.')) {
		return false;
	}
	try {
		var data = JSON.parse(shareDecode(hash));
		var shapeError = validateSnapshotShape(data);
		if (shapeError) throw new Error(shapeError);
		deserializeState(data);
		saveBackup();
		return true;
	} catch (e) {
		showToast('Could not decode shared FSM: ' + e.message, 'error');
		return false;
	}
}

// NFA simulation over the current diagram. Pure functions; the UI and the
// drawing layer do their own state management on top.

function parseSymbols(text) {
	if (text == null) return [''];
	var s = String(text);
	if (s.trim() === '') return [''];
	var parts = s.split(',');
	var out = [];
	for (var i = 0; i < parts.length; i++) out.push(parts[i].trim());
	return out;
}

function getStartStates(nodes, links) {
	var out = [];
	for (var i = 0; i < links.length; i++) {
		if (links[i] instanceof StartLink) {
			var idx = nodes.indexOf(links[i].node);
			if (idx !== -1) out.push(idx);
		}
	}
	return out;
}

function getOutgoing(nodeIndex, nodes, links) {
	var node = nodes[nodeIndex];
	var out = [];
	for (var i = 0; i < links.length; i++) {
		var l = links[i];
		if (l instanceof SelfLink && l.node === node) {
			out.push({ link: l, symbols: parseSymbols(l.text), target: nodeIndex });
		} else if (l instanceof Link && l.nodeA === node) {
			var t = nodes.indexOf(l.nodeB);
			if (t !== -1) {
				out.push({ link: l, symbols: parseSymbols(l.text), target: t });
			}
		}
	}
	return out;
}

function epsilonClosure(states, nodes, links) {
	var seen = {};
	var queue = [];
	for (var i = 0; i < states.length; i++) {
		seen[states[i]] = true;
		queue.push(states[i]);
	}
	while (queue.length) {
		var s = queue.shift();
		var outs = getOutgoing(s, nodes, links);
		for (var k = 0; k < outs.length; k++) {
			if (outs[k].symbols.indexOf('') === -1) continue;
			if (!seen[outs[k].target]) {
				seen[outs[k].target] = true;
				queue.push(outs[k].target);
			}
		}
	}
	var keys = Object.keys(seen);
	var result = [];
	for (var j = 0; j < keys.length; j++) result.push(+keys[j]);
	return result.sort(function (a, b) {
		return a - b;
	});
}

function simulateStep(activeStates, symbol, nodes, links) {
	var next = {};
	var taken = [];
	for (var i = 0; i < activeStates.length; i++) {
		var outs = getOutgoing(activeStates[i], nodes, links);
		for (var k = 0; k < outs.length; k++) {
			if (outs[k].symbols.indexOf(symbol) !== -1) {
				next[outs[k].target] = true;
				taken.push(outs[k].link);
			}
		}
	}
	var rawNext = Object.keys(next).map(Number);
	return { states: epsilonClosure(rawNext, nodes, links), links: taken };
}

function simulate(nodes, links, input) {
	var starts = getStartStates(nodes, links);
	if (starts.length === 0) {
		return { path: [], accepted: false, error: 'no start state' };
	}
	if (starts.length > 1) {
		return { path: [], accepted: false, error: 'multiple start states' };
	}

	var current = epsilonClosure([starts[0]], nodes, links);
	var path = [current.slice()];

	for (var i = 0; i < input.length; i++) {
		var sym = input.charAt(i);
		var step = simulateStep(current, sym, nodes, links);
		if (step.states.length === 0) {
			return {
				path: path,
				accepted: false,
				error:
					'no transition for ' + JSON.stringify(sym) + ' at step ' + (i + 1),
			};
		}
		current = step.states;
		path.push(current.slice());
	}

	var accepted = false;
	for (var j = 0; j < current.length; j++) {
		var n = nodes[current[j]];
		if (n && n.isAcceptState) {
			accepted = true;
			break;
		}
	}
	return { path: path, accepted: accepted };
}

// Theme manager: 'system' | 'light' | 'dark'.
// Default is 'system' (follows OS color scheme via prefers-color-scheme).
// User choice persists in localStorage['fsm_theme'].

var Theme = (function () {
	var KEY = 'fsm_theme';
	var current = 'system';
	var listeners = [];
	var mq = null;

	function getStored() {
		try {
			var v = localStorage.getItem(KEY);
			if (v === 'light' || v === 'dark' || v === 'system') return v;
		} catch (e) {}
		return 'system';
	}

	function setStored(v) {
		try {
			localStorage.setItem(KEY, v);
		} catch (e) {}
	}

	function apply() {
		var root = document.documentElement;
		if (current === 'system') {
			root.removeAttribute('data-theme');
		} else {
			root.setAttribute('data-theme', current);
		}
		notify();
	}

	function notify() {
		for (var i = 0; i < listeners.length; i++) {
			try {
				listeners[i]();
			} catch (e) {}
		}
	}

	function effective() {
		if (current !== 'system') return current;
		if (mq && mq.matches) return 'dark';
		return 'light';
	}

	function onSystemChange() {
		// Only matters if user is on 'system' mode.
		if (current === 'system') notify();
	}

	return {
		init: function () {
			current = getStored();
			if (window.matchMedia) {
				mq = window.matchMedia('(prefers-color-scheme: dark)');
				if (mq.addEventListener) mq.addEventListener('change', onSystemChange);
				else if (mq.addListener) mq.addListener(onSystemChange);
			}
			apply();
		},
		get: function () {
			return current;
		},
		effective: effective,
		cycle: function () {
			// system -> light -> dark -> system
			current =
				current === 'system'
					? 'light'
					: current === 'light'
						? 'dark'
						: 'system';
			setStored(current);
			apply();
		},
		set: function (v) {
			if (v !== 'system' && v !== 'light' && v !== 'dark') return;
			current = v;
			setStored(v);
			apply();
		},
		onChange: function (fn) {
			listeners.push(fn);
		},
	};
})();

// UI wiring: sidebar (FSM list), toolbar buttons, keyboard shortcuts beyond editor.
// Called from window.onload in fsm.js after Workspace.init() and History.reset().

function wireUI() {
	var sidebarList = document.getElementById('fsm-list');
	var newBtn = document.getElementById('btn-new-fsm');
	var undoBtn = document.getElementById('btn-undo');
	var redoBtn = document.getElementById('btn-redo');
	var clearBtn = document.getElementById('btn-clear');
	var pngBtn = document.getElementById('btn-png');
	var svgBtn = document.getElementById('btn-svg');
	var latexBtn = document.getElementById('btn-latex');
	var titleEl = document.getElementById('current-fsm-name');
	var themeBtn = document.getElementById('btn-theme');
	var shortcutsBtn = document.getElementById('btn-shortcuts');
	var shortcutsModal = document.getElementById('shortcuts-modal');
	var shortcutsClose = document.getElementById('btn-close-shortcuts');
	var shortcutsBody = document.getElementById('shortcuts-body');
	var latexModeSelect = document.getElementById('latex-mode');
	var arrowModeBtn = document.getElementById('btn-arrow-mode');
	var simBtn = document.getElementById('btn-simulate');
	var simPanel = document.getElementById('sim-panel');
	var simInput = document.getElementById('sim-input');
	var simRun = document.getElementById('sim-run');
	var simStep = document.getElementById('sim-step');
	var simReset = document.getElementById('sim-reset');
	var simStatus = document.getElementById('sim-status');
	var lintBtn = document.getElementById('btn-lint');
	var lintModal = document.getElementById('lint-modal');
	var lintClose = document.getElementById('btn-close-lint');
	var lintBody = document.getElementById('lint-body');
	var lintPrefs = document.getElementById('lint-prefs');
	var shareBtn = document.getElementById('btn-share');
	var importBtn = document.getElementById('btn-import');
	var importFile = document.getElementById('import-file');
	var exportJSONBtn = document.getElementById('btn-export-json');
	var layoutBtn = document.getElementById('btn-layout');
	var regexBtn = document.getElementById('btn-regex');
	var regexModal = document.getElementById('regex-modal');
	var regexClose = document.getElementById('btn-close-regex');
	var regexInput = document.getElementById('regex-input');
	var regexError = document.getElementById('regex-error');
	var regexPreview = document.getElementById('regex-preview');
	var regexInsertBtn = document.getElementById('regex-insert');
	var regexReplaceBtn = document.getElementById('regex-replace');
	var toDFABtn = document.getElementById('btn-to-dfa');
	var minimizeBtn = document.getElementById('btn-minimize');
	var nlBtn = document.getElementById('btn-nl');
	var nlModal = document.getElementById('nl-modal');
	var nlClose = document.getElementById('btn-close-nl');
	var nlKeyInput = document.getElementById('nl-key');
	var nlKeySave = document.getElementById('nl-key-save');
	var nlDesc = document.getElementById('nl-desc');
	var nlGenerateBtn = document.getElementById('nl-generate');
	var nlDescribeBtn = document.getElementById('nl-describe');
	var nlResponse = document.getElementById('nl-response');
	var examplesSelect = document.getElementById('examples-select');

	function switchToFsm(id) {
		if (id === Workspace.getActiveId()) return;
		flushHistory();
		saveBackup();
		Workspace.switchTo(id);
		restoreBackup();
		History.reset(snapshotJSON());
		draw();
		updateTitle();
	}

	function promptRename(fsm) {
		var newName = prompt('Rename FSM:', fsm.name);
		if (newName == null) return;
		newName = newName.trim();
		if (!newName) return;
		Workspace.rename(fsm.id, newName);
		updateTitle();
	}

	function deleteFsm(fsm) {
		if (!confirm('Delete "' + fsm.name + '"? This cannot be undone.')) return;
		var wasActive = fsm.id === Workspace.getActiveId();
		Workspace.remove(fsm.id);
		if (wasActive) {
			restoreBackup();
			History.reset(snapshotJSON());
			draw();
		}
		updateTitle();
	}

	function renderSidebar() {
		var fsms = Workspace.list();
		var activeId = Workspace.getActiveId();

		// rebuild list
		while (sidebarList.firstChild)
			sidebarList.removeChild(sidebarList.firstChild);

		fsms.forEach(function (fsm) {
			var li = document.createElement('li');
			li.className = fsm.id === activeId ? 'active' : '';

			var name = document.createElement('span');
			name.className = 'name';
			name.textContent = fsm.name;
			name.title = fsm.name;
			name.onclick = function () {
				switchToFsm(fsm.id);
			};
			name.ondblclick = function (e) {
				e.stopPropagation();
				promptRename(fsm);
			};

			var renameBtn = document.createElement('button');
			renameBtn.className = 'icon';
			renameBtn.title = 'Rename';
			renameBtn.textContent = '✎'; // pencil
			renameBtn.onclick = function (e) {
				e.stopPropagation();
				promptRename(fsm);
			};

			var delBtn = document.createElement('button');
			delBtn.className = 'icon';
			delBtn.title = 'Delete';
			delBtn.textContent = '×'; // ×
			delBtn.onclick = function (e) {
				e.stopPropagation();
				deleteFsm(fsm);
			};

			li.appendChild(name);
			li.appendChild(renameBtn);
			li.appendChild(delBtn);
			sidebarList.appendChild(li);
		});
	}

	function updateTitle() {
		var active = Workspace.getActive();
		if (titleEl && active) titleEl.textContent = active.name;
	}

	function updateToolbar() {
		undoBtn.disabled = !History.canUndo();
		redoBtn.disabled = !History.canRedo();
	}

	newBtn.onclick = function () {
		flushHistory();
		saveBackup();
		var id = Workspace.create();
		Workspace.switchTo(id);
		restoreBackup();
		History.reset(snapshotJSON());
		draw();
		updateTitle();
	};

	undoBtn.onclick = function () {
		performUndo();
	};
	redoBtn.onclick = function () {
		performRedo();
	};
	clearBtn.onclick = function () {
		clearAll();
	};

	function bindExport(btn, fn) {
		if (!btn) return;
		btn.onclick = function (e) {
			e.preventDefault();
			fn();
		};
	}
	bindExport(pngBtn, saveAsPNG);
	bindExport(svgBtn, saveAsSVG);
	bindExport(latexBtn, saveAsLaTeX);

	function updateThemeButton() {
		if (!themeBtn) return;
		var mode = Theme.get();
		var label =
			mode === 'system' ? 'Auto' : mode === 'light' ? 'Light' : 'Dark';
		var icon = mode === 'system' ? '◐' : mode === 'light' ? '☀' : '☾';
		themeBtn.textContent = icon + ' ' + label;
		themeBtn.setAttribute(
			'aria-label',
			'Theme: ' + label + ' (click to change)',
		);
		themeBtn.title = 'Theme: ' + label + ' (click to cycle)';
	}

	if (themeBtn && typeof Theme !== 'undefined') {
		themeBtn.onclick = function () {
			Theme.cycle();
		};
		Theme.onChange(function () {
			updateThemeButton();
			draw(); // re-render canvas with new theme colors
		});
		updateThemeButton();
	}

	var summaryEl = document.getElementById('fsm-summary');
	function updateFSMSummary() {
		if (summaryEl) summaryEl.textContent = summarizeFSM(nodes, links);
	}

	Workspace.onChange(function () {
		renderSidebar();
		updateTitle();
		updateLintBadge();
		updateFSMSummary();
	});
	History.onChange(function () {
		updateToolbar();
		updateLintBadge();
		updateFSMSummary();
	});

	// from upstream PR #39: shortcuts help modal, populated lazily from
	// LATEX_SHORTCUTS so the table stays the single source of truth. On mobile
	// the inline help block is hidden, so we also list canvas gestures here.
	function populateShortcuts() {
		if (!shortcutsBody || shortcutsBody.firstChild) return;

		var gestures = document.createElement('div');
		gestures.className = 'shortcut-cat';
		var gh = document.createElement('h3');
		gh.textContent = 'Canvas';
		gestures.appendChild(gh);
		var glist = document.createElement('ul');
		glist.style.margin = '0';
		glist.style.paddingLeft = '18px';
		var tips = [
			['Add a state', 'double-click empty canvas (or double-tap on touch)'],
			['Add an arrow', 'shift-drag, or use the arrow-mode toggle on touch'],
			['Move', 'drag any state or arrow'],
			['Delete', 'select then press Delete, or Backspace when label is empty'],
			['Accept state', 'double-click an existing state'],
			['Undo / Redo', 'Cmd/Ctrl+Z and Shift+Cmd/Ctrl+Z'],
			['Tab / Shift+Tab', 'cycle selection through nodes then links'],
			['N', 'new state at canvas center (when nothing is selected)'],
			[
				'L',
				'start an arrow from the selected state; Tab cycles target, Enter confirms',
			],
			['Arrow keys', 'nudge the selected state by 5px (Shift+Arrow for 1px)'],
			['Escape', 'deselect (or cancel an in-progress arrow)'],
		];
		for (var g = 0; g < tips.length; g++) {
			var li = document.createElement('li');
			li.style.fontSize = '13px';
			li.style.margin = '4px 0';
			var b = document.createElement('b');
			b.textContent = tips[g][0] + ': ';
			li.appendChild(b);
			li.appendChild(document.createTextNode(tips[g][1]));
			glist.appendChild(li);
		}
		gestures.appendChild(glist);
		shortcutsBody.appendChild(gestures);

		for (var i = 0; i < LATEX_SHORTCUTS.length; i++) {
			var cat = LATEX_SHORTCUTS[i];
			var section = document.createElement('div');
			section.className = 'shortcut-cat';
			var h = document.createElement('h3');
			h.textContent = cat.name;
			section.appendChild(h);
			var grid = document.createElement('div');
			grid.className = 'shortcut-grid';
			for (var j = 0; j < cat.entries.length; j++) {
				var row = document.createElement('div');
				var kbd = document.createElement('kbd');
				kbd.textContent = cat.entries[j][0];
				row.appendChild(kbd);
				row.appendChild(document.createTextNode(cat.entries[j][1]));
				grid.appendChild(row);
			}
			section.appendChild(grid);
			shortcutsBody.appendChild(section);
		}
	}

	function openShortcuts() {
		if (!shortcutsModal) return;
		populateShortcuts();
		shortcutsModal.hidden = false;
		// focus the close button so canvasHasFocus() returns false and stray
		// keystrokes do not type into the selected node behind the modal.
		if (shortcutsClose) shortcutsClose.focus();
	}

	function closeShortcuts() {
		if (shortcutsModal) shortcutsModal.hidden = true;
	}

	// from upstream PR #23: persist standalone-vs-snippet choice across reloads
	if (latexModeSelect) {
		var LATEX_MODE_KEY = 'fsm_latex_mode';
		try {
			var saved = localStorage.getItem(LATEX_MODE_KEY);
			if (saved === 'snippet' || saved === 'standalone') {
				latexModeSelect.value = saved;
			}
		} catch (e) {}
		latexModeSelect.onchange = function () {
			try {
				localStorage.setItem(LATEX_MODE_KEY, latexModeSelect.value);
			} catch (e) {}
		};
	}

	// from upstream PR #44: touch arrow-mode toggle. Single-finger drag normally
	// moves; with arrow mode on, the touch handlers fake shift so it creates a link.
	if (arrowModeBtn) {
		arrowModeBtn.onclick = function () {
			touchArrowMode = !touchArrowMode;
			arrowModeBtn.classList.toggle('on', touchArrowMode);
			arrowModeBtn.setAttribute(
				'aria-pressed',
				touchArrowMode ? 'true' : 'false',
			);
			arrowModeBtn.textContent = touchArrowMode ? 'Arrow: on' : 'Arrow: off';
		};
	}

	// Simulation panel. Read-only over the current diagram; bypasses History.
	var stepIndex = 0;
	function setSimStatus(text, kind) {
		if (!simStatus) return;
		simStatus.textContent = text || '';
		simStatus.className = 'sim-status' + (kind ? ' ' + kind : '');
	}
	function resetSim() {
		stepIndex = 0;
		simulationState = null;
		setSimStatus('');
		draw();
	}
	function runSim() {
		var result = simulate(nodes, links, simInput ? simInput.value : '');
		var last = result.path.length ? result.path[result.path.length - 1] : [];
		simulationState = {
			active: last,
			lastLink: null,
			accepted: result.accepted,
			error: result.error || null,
		};
		if (result.error) {
			setSimStatus(result.error, 'reject');
		} else {
			setSimStatus(
				result.accepted ? 'Accepted' : 'Rejected',
				result.accepted ? 'accept' : 'reject',
			);
		}
		stepIndex = result.path.length;
		draw();
	}
	function stepSim() {
		var input = simInput ? simInput.value : '';
		if (stepIndex === 0 || !simulationState) {
			var starts = getStartStates(nodes, links);
			if (starts.length !== 1) {
				simulationState = {
					active: [],
					lastLink: null,
					accepted: false,
					error:
						starts.length === 0 ? 'no start state' : 'multiple start states',
				};
				setSimStatus(simulationState.error, 'reject');
				draw();
				return;
			}
			simulationState = {
				active: epsilonClosure([starts[0]], nodes, links),
				lastLink: null,
				accepted: false,
				error: null,
			};
			stepIndex = 0;
			setSimStatus('step 0 of ' + input.length);
			draw();
			return;
		}
		if (stepIndex >= input.length) {
			var accepted = false;
			for (var i = 0; i < simulationState.active.length; i++) {
				var n = nodes[simulationState.active[i]];
				if (n && n.isAcceptState) accepted = true;
			}
			simulationState.accepted = accepted;
			setSimStatus(
				accepted ? 'Accepted' : 'Rejected',
				accepted ? 'accept' : 'reject',
			);
			draw();
			return;
		}
		var sym = input.charAt(stepIndex);
		var step = simulateStep(simulationState.active, sym, nodes, links);
		if (step.states.length === 0) {
			simulationState.error =
				'no transition for ' +
				JSON.stringify(sym) +
				' at step ' +
				(stepIndex + 1);
			setSimStatus(simulationState.error, 'reject');
			draw();
			return;
		}
		simulationState.active = step.states;
		simulationState.lastLink = step.links[0] || null;
		stepIndex++;
		setSimStatus(
			'step ' +
				stepIndex +
				' of ' +
				input.length +
				' (on ' +
				JSON.stringify(sym) +
				')',
		);
		draw();
		var reduceMotion =
			window.matchMedia &&
			window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (reduceMotion) {
			simulationState.lastLink = null;
			draw();
		} else {
			setTimeout(function () {
				if (simulationState) {
					simulationState.lastLink = null;
					draw();
				}
			}, 350);
		}
	}

	if (simBtn && simPanel) {
		simBtn.onclick = function () {
			simPanel.hidden = !simPanel.hidden;
			if (simPanel.hidden) resetSim();
			else if (simInput) simInput.focus();
		};
	}
	if (simRun) simRun.onclick = runSim;
	if (simStep) simStep.onclick = stepSim;
	if (simReset) simReset.onclick = resetSim;
	if (simInput) {
		simInput.onkeydown = function (e) {
			if (e.key === 'Enter') {
				e.preventDefault();
				runSim();
			}
		};
	}

	function activeLintWarnings() {
		var raw = lint(nodes, links);
		var out = [];
		for (var i = 0; i < raw.length; i++) {
			if (lintEnabledFor(raw[i].kind)) out.push(raw[i]);
		}
		return out;
	}

	function updateLintBadge() {
		if (!lintBtn) return;
		var warnings = activeLintWarnings();
		while (lintBtn.firstChild) lintBtn.removeChild(lintBtn.firstChild);
		lintBtn.appendChild(document.createTextNode('Lint'));
		if (!warnings.length) return;
		var sev = 'info';
		for (var i = 0; i < warnings.length; i++) {
			if (warnings[i].severity === 'error') {
				sev = 'error';
				break;
			}
			if (warnings[i].severity === 'warning') sev = 'warn';
		}
		var badge = document.createElement('span');
		badge.className = 'badge ' + sev;
		badge.textContent = warnings.length;
		lintBtn.appendChild(badge);
	}

	function renderLintList() {
		if (!lintBody) return;
		while (lintBody.firstChild) lintBody.removeChild(lintBody.firstChild);
		var warnings = activeLintWarnings();
		if (!warnings.length) {
			var empty = document.createElement('div');
			empty.className = 'lint-empty';
			empty.textContent = 'no issues';
			lintBody.appendChild(empty);
			return;
		}
		var list = document.createElement('ul');
		list.className = 'lint-list';
		for (var i = 0; i < warnings.length; i++) {
			(function (w) {
				var li = document.createElement('li');
				if (!w.element) li.className = 'no-target';
				var sev = document.createElement('span');
				sev.className = 'lint-sev ' + w.severity;
				sev.textContent = w.severity;
				li.appendChild(sev);
				li.appendChild(document.createTextNode(w.message));
				if (w.element) {
					li.onclick = function () {
						selectedObject = w.element;
						lintModal.hidden = true;
						draw();
					};
				}
				list.appendChild(li);
			})(warnings[i]);
		}
		lintBody.appendChild(list);
	}

	function renderLintPrefs() {
		if (!lintPrefs) return;
		while (lintPrefs.firstChild) lintPrefs.removeChild(lintPrefs.firstChild);
		var h = document.createElement('h3');
		h.textContent = 'Enabled checks';
		lintPrefs.appendChild(h);
		for (var i = 0; i < LINT_KINDS.length; i++) {
			(function (k) {
				var label = document.createElement('label');
				var cb = document.createElement('input');
				cb.type = 'checkbox';
				cb.checked = lintEnabledFor(k.id);
				cb.onchange = function () {
					setLintEnabled(k.id, cb.checked);
					renderLintList();
					updateLintBadge();
				};
				label.appendChild(cb);
				label.appendChild(document.createTextNode(' ' + k.label));
				lintPrefs.appendChild(label);
			})(LINT_KINDS[i]);
		}
	}

	if (lintBtn) {
		lintBtn.onclick = function () {
			if (!lintModal) return;
			renderLintList();
			renderLintPrefs();
			lintModal.hidden = false;
			if (lintClose) lintClose.focus();
		};
	}
	if (lintClose)
		lintClose.onclick = function () {
			lintModal.hidden = true;
		};
	if (lintModal) {
		lintModal.onclick = function (e) {
			if (e.target === lintModal) lintModal.hidden = true;
		};
	}
	document.addEventListener('keydown', function (e) {
		if (e.key === 'Escape' && lintModal && lintModal.hidden === false) {
			lintModal.hidden = true;
		}
	});

	if (shareBtn) shareBtn.onclick = copyShareLink;

	var regexPreviewTimer = null;
	function renderRegexPreview() {
		if (!regexPreview || !regexInput) return;
		var text = regexInput.value;
		if (!text) {
			regexError.textContent = '';
			regexPreview
				.getContext('2d')
				.clearRect(0, 0, regexPreview.width, regexPreview.height);
			return;
		}
		try {
			var json = regexToNFA(text);
			regexError.textContent = json.nodes.length + ' states';
			previewFSMJson(json, regexPreview);
		} catch (e) {
			regexError.textContent = e.message;
		}
	}
	if (regexBtn && regexModal) {
		regexBtn.onclick = function () {
			regexModal.hidden = false;
			if (regexInput) {
				regexInput.focus();
				renderRegexPreview();
			}
		};
	}
	if (regexClose)
		regexClose.onclick = function () {
			regexModal.hidden = true;
		};
	if (regexModal) {
		regexModal.onclick = function (e) {
			if (e.target === regexModal) regexModal.hidden = true;
		};
	}
	if (regexInput) {
		regexInput.oninput = function () {
			clearTimeout(regexPreviewTimer);
			regexPreviewTimer = setTimeout(renderRegexPreview, 150);
		};
	}
	if (regexInsertBtn) {
		regexInsertBtn.onclick = function () {
			try {
				var json = regexToNFA(regexInput.value);
				applyFSMJsonAsNew(json, 'Regex: ' + regexInput.value);
				regexModal.hidden = true;
			} catch (e) {
				regexError.textContent = e.message;
			}
		};
	}
	if (regexReplaceBtn) {
		regexReplaceBtn.onclick = function () {
			try {
				var json = regexToNFA(regexInput.value);
				applyFSMJsonInPlace(json);
				regexModal.hidden = true;
			} catch (e) {
				regexError.textContent = e.message;
			}
		};
	}

	function currentFSMAsJson() {
		var s = serializeState();
		return { format: SAVE_FORMAT, nodes: s.nodes, links: s.links };
	}

	if (toDFABtn) {
		toDFABtn.onclick = function () {
			try {
				var result = nfaToDFA(currentFSMAsJson());
				if (
					!confirm(
						'Convert: ' +
							nodes.length +
							' states -> ' +
							result.nodes.length +
							' states. Create as a new FSM in the workspace?',
					)
				)
					return;
				applyFSMJsonAsNew(
					result,
					'DFA of ' +
						(Workspace.getActive() ? Workspace.getActive().name : 'FSM'),
				);
			} catch (e) {
				showToast(e.message, 'error');
			}
		};
	}

	function setNLResponse(text, busy) {
		if (!nlResponse) return;
		nlResponse.textContent = text || 'Responses will appear here.';
		nlResponse.classList.toggle('empty', !text);
		var modal = nlModal && nlModal.querySelector('.modal');
		if (modal) modal.classList.toggle('nl-busy', !!busy);
	}

	function syncNLKey() {
		if (nlKeyInput) nlKeyInput.value = getModelKey();
	}

	if (nlBtn && nlModal) {
		nlBtn.onclick = function () {
			syncNLKey();
			nlModal.hidden = false;
			if (nlDesc) nlDesc.focus();
		};
	}
	if (nlClose)
		nlClose.onclick = function () {
			nlModal.hidden = true;
		};
	if (nlModal) {
		nlModal.onclick = function (e) {
			if (e.target === nlModal) nlModal.hidden = true;
		};
	}
	if (nlKeySave) {
		nlKeySave.onclick = function () {
			setModelKey(nlKeyInput.value.trim());
			showToast(nlKeyInput.value.trim() ? 'Key saved' : 'Key cleared');
		};
	}
	if (nlGenerateBtn) {
		nlGenerateBtn.onclick = function () {
			if (!getModelKey()) {
				setNLResponse(
					'Add your API key above to enable natural-language features.',
				);
				if (nlKeyInput) nlKeyInput.focus();
				return;
			}
			var desc = nlDesc ? nlDesc.value.trim() : '';
			if (!desc) {
				setNLResponse('Describe the FSM you want generated.');
				return;
			}
			setNLResponse('Generating...', true);
			generateFSMFromText(desc).then(
				function (json) {
					setNLResponse(
						'Generated ' +
							json.nodes.length +
							' states; inserted as a new FSM.',
					);
					applyFSMJsonAsNew(json, 'NL: ' + desc.slice(0, 40));
				},
				function (err) {
					setNLResponse(String(err.message || err));
				},
			);
		};
	}
	if (nlDescribeBtn) {
		nlDescribeBtn.onclick = function () {
			if (!getModelKey()) {
				setNLResponse(
					'Add your API key above to enable natural-language features.',
				);
				if (nlKeyInput) nlKeyInput.focus();
				return;
			}
			if (!nodes.length) {
				setNLResponse('Draw or load an FSM first.');
				return;
			}
			setNLResponse('Reading the diagram...', true);
			describeFSM(currentFSMAsJson()).then(
				function (text) {
					setNLResponse(text);
				},
				function (err) {
					setNLResponse(String(err.message || err));
				},
			);
		};
	}

	if (examplesSelect && typeof EXAMPLES !== 'undefined') {
		for (var ei = 0; ei < EXAMPLES.length; ei++) {
			var opt = document.createElement('option');
			opt.value = String(ei);
			opt.textContent = EXAMPLES[ei].name;
			examplesSelect.appendChild(opt);
		}
		examplesSelect.onchange = function () {
			var idx = parseInt(examplesSelect.value, 10);
			examplesSelect.value = '';
			if (isNaN(idx) || !EXAMPLES[idx]) return;
			try {
				applyFSMJsonAsNew(EXAMPLES[idx].build(), EXAMPLES[idx].name);
			} catch (e) {
				showToast('Could not load example: ' + e.message, 'error');
			}
		};
	}

	if (minimizeBtn) {
		minimizeBtn.onclick = function () {
			try {
				var result = minimize(currentFSMAsJson());
				if (
					!confirm(
						'Minimize: ' +
							nodes.length +
							' states -> ' +
							result.nodes.length +
							' states. Create as a new FSM?',
					)
				)
					return;
				applyFSMJsonAsNew(
					result,
					'Min of ' +
						(Workspace.getActive() ? Workspace.getActive().name : 'FSM'),
				);
			} catch (e) {
				showToast(e.message, 'error');
			}
		};
	}

	// Swap live nodes/links/canvas for a JSON-driven render onto a target
	// canvas, then restore. Used by the regex preview and would-be other
	// algorithm previews. The "live" arrays are mutated in place so the
	// rest of the editor doesn't see the swap.
	function previewFSMJson(json, target) {
		var savedNodes = nodes.slice();
		var savedLinks = links.slice();
		var savedSelected = selectedObject;
		var savedSim = simulationState;
		var savedCanvas = canvas;
		try {
			nodes.length = 0;
			links.length = 0;
			selectedObject = null;
			simulationState = null;
			canvas = target;
			deserializeState(json);
			layout(nodes, links);
			drawUsing(target.getContext('2d'), EXPORT_COLORS);
		} finally {
			nodes.length = 0;
			links.length = 0;
			for (var i = 0; i < savedNodes.length; i++) nodes.push(savedNodes[i]);
			for (var j = 0; j < savedLinks.length; j++) links.push(savedLinks[j]);
			canvas = savedCanvas;
			selectedObject = savedSelected;
			simulationState = savedSim;
		}
	}

	function applyFSMJsonAsNew(json, name) {
		flushHistory();
		saveBackup();
		var id = Workspace.create(name || 'FSM');
		Workspace.switchTo(id);
		deserializeState(json);
		layout(nodes, links);
		commitHistory();
		draw();
		updateTitle();
	}

	function applyFSMJsonInPlace(json) {
		flushHistory();
		deserializeState(json);
		layout(nodes, links);
		commitHistory();
		draw();
	}

	if (layoutBtn) {
		layoutBtn.onclick = function () {
			if (!nodes.length) return;
			flushHistory();
			layout(nodes, links);
			commitHistory();
			draw();
		};
	}

	if (exportJSONBtn) {
		exportJSONBtn.onclick = function () {
			var text = JSON.stringify(exportSnapshot(), null, 2);
			var ok = downloadBlob(
				activeFSMFileName('json'),
				text,
				'application/json',
			);
			showToast(
				ok ? 'JSON downloaded' : 'Could not download JSON',
				ok ? null : 'error',
			);
		};
	}

	if (importBtn && importFile) {
		importBtn.onclick = function () {
			importFile.click();
		};
		importFile.onchange = function () {
			var file = importFile.files && importFile.files[0];
			if (!file) return;
			var reader = new FileReader();
			reader.onload = function () {
				try {
					var obj = JSON.parse(reader.result);
					var err = validateSnapshot(obj);
					if (err) {
						showToast('Invalid: ' + err, 'error');
						return;
					}
					flushHistory();
					deserializeState(obj);
					commitHistory();
					draw();
					showToast('Imported');
				} catch (e) {
					showToast('Could not parse JSON', 'error');
				}
				importFile.value = '';
			};
			reader.onerror = function () {
				showToast('Could not read file', 'error');
				importFile.value = '';
			};
			reader.readAsText(file);
		};
	}

	if (shortcutsBtn) shortcutsBtn.onclick = openShortcuts;
	if (shortcutsClose) shortcutsClose.onclick = closeShortcuts;
	if (shortcutsModal) {
		shortcutsModal.onclick = function (e) {
			if (e.target === shortcutsModal) closeShortcuts();
		};
	}
	document.addEventListener('keydown', function (e) {
		if (
			e.key === 'Escape' &&
			shortcutsModal &&
			shortcutsModal.hidden === false
		) {
			closeShortcuts();
		}
	});

	// from upstream PR #44: keep the canvas in sync with its parent on orientation
	// change / window resize. Drawing buffer stays 800x600; the CSS aspect-ratio
	// handles visual scaling, this just forces a repaint so theme transitions and
	// any in-flight selection redraw cleanly.
	if (typeof ResizeObserver !== 'undefined') {
		var wrap = document.querySelector('.canvas-wrap');
		if (wrap) {
			new ResizeObserver(function () {
				draw();
			}).observe(wrap);
		}
	}

	renderSidebar();
	updateTitle();
	updateToolbar();
	updateLintBadge();
	updateFSMSummary();
}

// Workspace: manages multiple FSMs persisted in localStorage.
// Storage layout:
//   fsm_workspace = { version, activeId, fsms: [{id, name, createdAt, updatedAt}] }
//   fsm_data_<id> = { nodes: [...], links: [...] }
// Migrates legacy `fsm` key (single-FSM) into the new format on first load.

var Workspace = (function () {
	var WORKSPACE_KEY = 'fsm_workspace';
	var DATA_PREFIX = 'fsm_data_';
	var LEGACY_KEY = 'fsm';
	var VERSION = 2;

	var meta = null;
	var listeners = [];

	function uuid() {
		if (typeof crypto !== 'undefined' && crypto.randomUUID) {
			try {
				return crypto.randomUUID();
			} catch (e) {}
		}
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
			/[xy]/g,
			function (c) {
				var r = (Math.random() * 16) | 0;
				var v = c === 'x' ? r : (r & 0x3) | 0x8;
				return v.toString(16);
			},
		);
	}

	function dataKey(id) {
		return DATA_PREFIX + id;
	}

	function safeGet(key) {
		try {
			return localStorage.getItem(key);
		} catch (e) {
			return null;
		}
	}

	function safeSet(key, val) {
		try {
			localStorage.setItem(key, val);
		} catch (e) {}
	}

	function safeRemove(key) {
		try {
			localStorage.removeItem(key);
		} catch (e) {}
	}

	function loadMeta() {
		var raw = safeGet(WORKSPACE_KEY);
		if (!raw) return null;
		try {
			var obj = JSON.parse(raw);
			if (obj && obj.fsms) return obj;
		} catch (e) {}
		return null;
	}

	function saveMeta() {
		safeSet(WORKSPACE_KEY, JSON.stringify(meta));
	}

	function readData(id) {
		var raw = safeGet(dataKey(id));
		if (!raw) return { nodes: [], links: [] };
		try {
			var obj = JSON.parse(raw);
			if (obj && obj.nodes && obj.links) return obj;
		} catch (e) {}
		return { nodes: [], links: [] };
	}

	function writeData(id, data) {
		safeSet(dataKey(id), JSON.stringify(data));
	}

	function migrate() {
		var legacyRaw = safeGet(LEGACY_KEY);
		var id = uuid();
		var now = Date.now();
		meta = {
			version: VERSION,
			activeId: id,
			fsms: [{ id: id, name: 'FSM 1', createdAt: now, updatedAt: now }],
		};
		if (legacyRaw) {
			try {
				var parsed = JSON.parse(legacyRaw);
				if (parsed && parsed.nodes && parsed.links) {
					writeData(id, parsed);
				}
			} catch (e) {}
		} else {
			writeData(id, { nodes: [], links: [] });
		}
		saveMeta();
		safeRemove(LEGACY_KEY);
	}

	function ensureNonEmpty() {
		if (!meta.fsms.length) {
			var id = uuid();
			var now = Date.now();
			meta.fsms.push({ id: id, name: 'FSM 1', createdAt: now, updatedAt: now });
			meta.activeId = id;
			writeData(id, { nodes: [], links: [] });
		}
		// validate activeId
		var found = false;
		for (var i = 0; i < meta.fsms.length; i++) {
			if (meta.fsms[i].id === meta.activeId) {
				found = true;
				break;
			}
		}
		if (!found) meta.activeId = meta.fsms[0].id;
	}

	function findFsm(id) {
		for (var i = 0; i < meta.fsms.length; i++) {
			if (meta.fsms[i].id === id) return meta.fsms[i];
		}
		return null;
	}

	function notify() {
		for (var i = 0; i < listeners.length; i++) {
			try {
				listeners[i]();
			} catch (e) {}
		}
	}

	return {
		init: function () {
			meta = loadMeta();
			if (!meta) {
				migrate();
			}
			ensureNonEmpty();
			saveMeta();
		},
		list: function () {
			return meta.fsms.map(function (f) {
				return { id: f.id, name: f.name };
			});
		},
		getActiveId: function () {
			return meta.activeId;
		},
		getActive: function () {
			return findFsm(meta.activeId);
		},
		loadActive: function () {
			return readData(meta.activeId);
		},
		saveActive: function (data) {
			writeData(meta.activeId, data);
			var active = findFsm(meta.activeId);
			if (active) {
				active.updatedAt = Date.now();
				saveMeta();
			}
		},
		create: function (name) {
			var id = uuid();
			var now = Date.now();
			var fsm = {
				id: id,
				name: name || 'FSM ' + (meta.fsms.length + 1),
				createdAt: now,
				updatedAt: now,
			};
			meta.fsms.push(fsm);
			writeData(id, { nodes: [], links: [] });
			saveMeta();
			notify();
			return id;
		},
		rename: function (id, name) {
			var fsm = findFsm(id);
			if (!fsm) return;
			fsm.name = name;
			fsm.updatedAt = Date.now();
			saveMeta();
			notify();
		},
		remove: function (id) {
			for (var i = 0; i < meta.fsms.length; i++) {
				if (meta.fsms[i].id === id) {
					meta.fsms.splice(i, 1);
					break;
				}
			}
			safeRemove(dataKey(id));
			if (meta.activeId === id) {
				meta.activeId = meta.fsms.length ? meta.fsms[0].id : null;
			}
			ensureNonEmpty();
			saveMeta();
			notify();
		},
		switchTo: function (id) {
			if (!findFsm(id)) return;
			meta.activeId = id;
			saveMeta();
			notify();
		},
		onChange: function (fn) {
			listeners.push(fn);
		},
	};
})();
