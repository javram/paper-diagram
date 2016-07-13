//var gCanvas;
var validSteps = ["start", "end", "process", "decision", "document", "data"];

function extend(o) {
    function F() { }
    F.prototype = o;
    return new F();
}

function extendParams() {
    for (var i = 1; i < arguments.length; i++)
        for (var key in arguments[i])
            if (arguments[i].hasOwnProperty(key))
                arguments[0][key] = arguments[i][key];
    return arguments[0];
}

function generateUUID() {
    var d = new Date().getTime();
    if (window.performance && typeof window.performance.now === "function") {
        d += performance.now(); //use high-precision timer if available
    }
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = (d + Math.random() * 16) % 16 | 0;
        d = Math.floor(d / 16);
        return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
    return uuid;
}

//Our Step Object
var diagramStep = function (helper, id, params) {

    var _helper = helper,
        _id = id,
        _x = 0,
        _y = 0,
        _steptype = "process",
        _text = "",
        _fillColor = "#d1d1d1",
        _textColor = "#777777",
        _anchorFillColor = "#777777",
        _anchorHighlightColor = "#9ED6FF",
        _maxInboundLinks = -1,
        _maxOutboundLinks = -1,
        _data = {},
        _size = [120, 80],
        _stepGroup = null,
        _anchorGroup = null,
        _controlGroup = null,
        _onTextDoubleClick = function () {
            var stepName = prompt("Enter step name", _text);
            if (stepName != null) {
                _text = stepName;
                _draw();
            }
        },
        _onDeleteClick = function () {
            if (confirm("Delete Step: " + _text + "?")) {
                _removeStep();
            }
        };

    _setParams(params);

    function _anchorHitTest(point) {
        if (_anchorGroup != null) {
            for (var i = 0; i < _anchorGroup.children.length; i++) {
                if (_anchorGroup.children[i].contains(point)) {
                    return _anchorGroup.children[i].data.Direction;
                }
            }
        }

        return -1;
    };

    function _draw() {

        if (_stepGroup != null) {
            _stepGroup.remove();
        }

        _stepGroup = new paper.Group();

        var step;

        switch (_steptype) {
            case "start":
            case "end":
                step = new paper.Path.RoundRectangle(
                    new paper.Rectangle([0, 0], _size),
                    [20, 20]);
                step.fillColor = _fillColor;
                break;
            case "decision":
                step = new paper.Path({
                    segments: [_localAnchorPoint(0),
                        _localAnchorPoint(1),
                        _localAnchorPoint(2),
                        _localAnchorPoint(3)],
                    fillColor: _fillColor
                    //closed: _this
                });
                break;
            case "document":

                var vector = new paper.Point({
                    angle: -30,
                    length: _size[0] / 6
                });

                step = new paper.Path({
                    segments: [
                        [0, 5],
                        [_size[0], 5],
                        [_size[0], _size[1]],
                        [[_size[0] / 2, _size[1]], vector, vector.rotate(180)],
                        [0, _size[1]]
                    ],
                    fillColor: _fillColor,
                    closed: true
                });
                break;
            default:
                step = new paper.Path.Rectangle(
                {
                    point: [0, 0],
                    size: _size,
                    fillColor: _fillColor
                });
                break;
        }

        _stepGroup.addChild(step);
        var stepText;

        if (_text != "") {
            
            var outText = _helper.getTextLines(_text, _size[0] * 0.8);

            stepText = new paper.PointText(
            {
                point: [0, 0],
                content: outText,
                fontSize: 12,
                fillColor: _textColor,
                fontFamily: "Arial",
            });
        } else {

            stepText = new paper.Path.Rectangle(
            {
                point: [0, 0],
                size: [40, 12],
                strokeColor: _textColor,
                strokeWidth: 1,
                fillColor: _fillColor,
                dashArray: [5, 7]
            });
        }

        stepText.position = _localStepCenter();

        //Allow the label to be changed by doubleClick
        stepText.onDoubleClick = function (event) {
            _onTextDoubleClick();
        }

        _stepGroup.addChild(stepText);

        _stepGroup.position = [_x, _y];
    };


    function _drawAnchor(direction) {

        var pt = _localAnchorPoint(direction);
        var rectangle;

        switch (direction) {
            case 0:
                rectangle = new paper.Rectangle(pt[0] - 4, pt[1], 8, 8);
                break;
            case 1:
                rectangle = new paper.Rectangle(pt[0] - 8, pt[1] - 4, 8, 8);
                break;
            case 2:
                rectangle = new paper.Rectangle(pt[0] - 4, pt[1] - 8, 8, 8);
                break;
            case 3:
                rectangle = new paper.Rectangle(pt[0], pt[1] - 4, 8, 8);
                break;
        }

        var anchorPath = new paper.Path.Rectangle(rectangle);
        anchorPath.fillColor = _anchorFillColor;
        anchorPath.bringToFront();
        anchorPath.data = {
            Direction: direction
        };

        return anchorPath;
    };

    function _drawControls() {

        if (_controlGroup != null) {
            _controlGroup.remove();
        }

        _controlGroup = new paper.Group();

        var deleteControl = new paper.Group();
        var deleteBase = new paper.Path.Circle(
        {
            point: [0, 0],
            radius: 5,
            fillColor: "#ff0000",
            strokeColor: "#333",
            strokeWidth: 2
        });
        deleteControl.addChild(deleteBase);
        var deleteText = new paper.PointText(
        {
            point: [-2, 2],
            content: "X",
            fontSize: 6,
            strokeColor: "#333",
            fontFamily: "Arial",
        });
        deleteControl.addChild(deleteText);
        if (_steptype == "decision") {
            deleteControl.position = [_x + (_size[0] / 5), _y - (_size[1] / 5)];
        } else {
            deleteControl.position = [_x + (_size[0] / 2.5), _y - (_size[1] / 2.5)];
        }
        deleteControl.onClick = function (event) {
            _onDeleteClick();
        }
        _controlGroup.addChild(deleteControl);

        _controlGroup.bringToFront();
    };

    function _export() {
        return {
            id: _id,
            x: _x,
            y: _y,
            steptype: _steptype,
            text: _text,
            fillColor: _fillColor,
            textColor: _textColor,
            anchorFillColor: _anchorFillColor,
            anchorHighlightColor: _anchorHighlightColor,
            maxInboundLinks: _maxInboundLinks,
            maxOutboundLinks: _maxOutboundLinks,
            data: _data
        };
    };

    function _getAnchorPoint(direction) {

        switch (direction) {
            case 0: //north
                return [_x, _y - _size[1] / 2];
            case 1: //east
                return [_x + _size[0] / 2, _y];
            case 2: //south
                return [_x, _y + _size[1] / 2];
            case 3: //west
                return [_x - _size[0] / 2, _y];
        }

        return [0, 0];
    };


    function _hideAnchorPoints() {
        if (_anchorGroup != null) {
            _anchorGroup.remove();
            _anchorGroup = null;
        }
    }

    function _hideControls() {
        if (_controlGroup != null) {
            _controlGroup.remove();
            _controlGroup = null;
        }
    };;

    function _highlightAnchorPoints(direction) {
        if (_anchorGroup != null) {
            for (var i = 0; i < _anchorGroup.children.length; i++) {
                if (_anchorGroup.children[i].data.Direction == direction) {
                    _anchorGroup.children[i].fillColor = _anchorHighlightColor;
                } else {
                    _anchorGroup.children[i].fillColor = _anchorFillColor;
                }
            }
        }
    };

    function _hitTest(point) {
        if (_stepGroup != null) {
            return _stepGroup.contains(point);
        }

        return false;
    };


    function _localAnchorPoint(direction) {
        switch (direction) {
            case 0: //north
                return [_size[0] / 2, 0];
            case 1: //east
                return [_size[0], _size[1] / 2];
            case 2: //south
                return [_size[0] / 2, _size[1]];
            case 3: //west
                return [0, _size[1] / 2];
        }

        return [0, 0];
    };

    function _localStepCenter() {
        return new paper.Point(_size[0] / 2, _size[1] / 2);
    };

    function _move(xPos, yPos) {
        _x = Math.max(xPos, 0);
        _y = Math.max(yPos, 0);

        if (_stepGroup != null) {
            _stepGroup.position = [_x, _y];
        }

        if (_anchorGroup != null) {
            _anchorGroup.position = [_x, _y];
        }
    };

    function _moveDelta(xdelta, ydelta) {
        _move(_x + xdelta, _y + ydelta);
    };

    function _removeStep() {
        if (_stepGroup != null) {
            _stepGroup.remove();
        }

        if (_anchorGroup != null) {
            _anchorGroup.remove();
        }

        if (_controlGroup != null) {
            _controlGroup.remove();
        }
    };

    function _setParams(params) {
        var properties = extendParams({
            x: _x,
            y: _y,
            steptype: _steptype,
            text: _text,
            fillColor: _fillColor,
            textColor: _textColor,
            anchorFillColor: _anchorFillColor,
            anchorHighlightColor: _anchorHighlightColor,
            maxInboundLinks: _maxInboundLinks,
            maxOutboundLinks: _maxOutboundLinks,
            data: _data,
            onTextDoubleClick: _onTextDoubleClick,
            onDeleteClick: _onDeleteClick
        }, params);

        _x = properties.x;
        _y = properties.y;
        _text = properties.text;
        _steptype = properties.steptype;
        _fillColor = properties.fillColor;
        _textColor = properties.textColor;
        _anchorFillColor = properties.anchorFillColor;
        _anchorHighlightColor = properties.anchorHighlightColor;
        _maxInboundLinks = properties.maxInboundLinks;
        _maxOutboundLinks = properties.maxOutboundLinks;
        _data = properties.data;
        _onTextDoubleClick = properties.onTextDoubleClick;
        _onDeleteClick = properties.onDeleteClick;

        switch (_steptype) {
            case "start":
            case "end":
                _size = [100, 50];
                break;
            case "decision":
                _size = [140, 100];
                break;
            default:
                _size = [120, 80];
                break;
        }

        _draw();
    };

    function _showAnchorPoints() {
        if (_anchorGroup == null) {
            _anchorGroup = new paper.Group();
            _anchorGroup.addChild(_drawAnchor(0));
            _anchorGroup.addChild(_drawAnchor(1));
            _anchorGroup.addChild(_drawAnchor(2));
            _anchorGroup.addChild(_drawAnchor(3));
            _anchorGroup.position = new paper.Point(_x, _y);
        }
    };

    return {
        anchorHitTest: function (point) {
            return _anchorHitTest(point);
        },
        data: function (value) {
            if (arguments.length == 0) {
                return _data;
            } else {
                _data = value;
            }
        },
        draw: function () {
            _draw();
        },
        drawControls: function () {
            _drawControls();
        },
        exportStep: function () {
            return _export();
        },
        getAnchorPoint: function (direction) {
            return _getAnchorPoint(direction);;
        },
        hideAnchorPoints: function() {
            _hideAnchorPoints();
        },
        hideControls: function () {
            _hideControls();
        },
        highlightAnchorPoints: function (direction) {
            return _highlightAnchorPoints(direction);
        },
        hitTest: function (point) {
            return _hitTest(point);
        },
        id: function () {
            return _id;
        },
        maxInboundLinks: function (value) {
            if (arguments.length == 0) {
                return _maxInboundLinks;
            } else {
                _maxInboundLinks = value;
            }
        },
        maxOutboundLinks: function (value) {
            if (arguments.length == 0) {
                return _maxOutboundLinks;
            } else {
                _maxOutboundLinks = value;
            }
        },
        moveDelta: function (xdelta, ydelta) {
            return _moveDelta(xdelta, ydelta);
        },
        removeStep: function () {
            _removeStep();
        },
        setParams: function(params) {
            _setParams(params);
        },
        showAnchorPoints: function () {
            _showAnchorPoints();
        },
        text: function (value) {
            if (arguments.length == 0) {
                return _text;
            } else {
                _text = value;
                _draw();
            }
        }
    };

};



//Our Link Object
var diagramLink = function (helper, id, params) {

    var _helper = helper,
        _id = id,
        _startStep = null,
        _startDirection = 0,
        _endStep = null,
        _endDirection = 0,
        _text = "",
        _strokeColor = "#b1b1b1",
        _strokeWidth = 3,
        _anchorStrokeColor = "#777777",
        _anchorFillColor = "#FFFFFF",
        _anchorHighlightColor = "#9ED6FF",
        _extraPoints = [],
        _data = {},
        _anchorGroup = null,
        _linkGroup = null,
        _controlGroup = null,
        _onTextDoubleClick = function () {
            var linkName = prompt("Enter link name", _text);
            if (linkName != null) {
                _text = linkName;
                _draw();
            }
        },
        _onDeleteClick = function () {
            if (confirm("Delete Link: " + _text + "?")) {
                _removeLink();
            }
        },
        _onAddExtraPointClick = function () {
            _addExtraPoint();
            _drawControls();
        };

    _setParams(params);

    function _addExtraPoint() {

        var startPt, endPt = _endStep.getAnchorPoint(_endDirection);

        if (_extraPoints.length > 0) {
            startPt = _extraPoints[_extraPoints.length - 1];
        } else {
            startPt = _startStep.getAnchorPoint(_startDirection);
        }

        var newPoint = [(startPt[0] + endPt[0]) / 2, (startPt[1] + endPt[1]) / 2];
        _extraPoints.push(newPoint);

        _drawAnchors();
    };

    function _anchorHitTest(point) {
        if (_anchorGroup != null) {
            for (var i = 0; i < _anchorGroup.children.length; i++) {
                if (_anchorGroup.children[i].hitTest(point, {
                    stroke: true,
                    segments: true,
                    fill: true,
                    tolerance: 0
                })) {
                    return i;
                }
            }
        }

        return -1;
    };

    function _draw() {

        if (_linkGroup != null) {
            _linkGroup.remove();
        }

        _linkGroup = new paper.Group();

        var linkPath = new paper.Path({
            segments: _helper.getArrowLineSegments(_startStep.getAnchorPoint(_startDirection),
                                           _extraPoints,
                                           _endStep.getAnchorPoint(_endDirection)),
            strokeColor: _strokeColor,
            strokeWidth: _strokeWidth,
            strokeCap: "round"
        });

        _linkGroup.addChild(linkPath);

        if (_text != "") {

            var linkText = new paper.PointText(
            {
                point: [0, 0],
                content: _helper.getTextLines(_text, 100),
                fontSize: 12,
                fillColor: _strokeColor,
                fontFamily: "Arial",
            });
            linkText.position = _textPosition();
            _linkGroup.addChild(linkText);

            var linkTextBkg = new paper.Path.Rectangle(
            {
                point: [0, 0],
                size: [linkText.bounds.width, linkText.bounds.height],
                fillColor: "#ffffff"
            });
            linkTextBkg.position = _textPosition();

            _linkGroup.addChild(linkTextBkg);
            linkText.bringToFront();

            linkText.onDoubleClick = function (event) {
                _onTextDoubleClick();
            }

        } else {
            linkPath.onDoubleClick = function (event) {
                _onTextDoubleClick();
            }
        }

        //linkPath.onClick = function (event) {
        //    if (_this.selected === true) {
        //        _this.selected = false;
        //    } else {
        //        _this.selected = true;
        //    }
        //    _this.draw();
        //}

    };

    function _drawAnchors() {

        if (_anchorGroup != null) {
            _anchorGroup.remove();
        }

        _anchorGroup = new paper.Group();

        var startAnchor = new paper.Path.Circle(
        {
            point: [0, 0],
            radius: 5,
            fillColor: _anchorFillColor,
            strokeColor: _anchorStrokeColor,
            strokeWidth: 2
        });

        startAnchor.position = _getStartAnchorPosition(8);
        _anchorGroup.addChild(startAnchor);

        var endAnchor = new paper.Path.Circle(
        {
            point: [0, 0],
            radius: 5,
            fillColor: _anchorFillColor,
            strokeColor: _anchorStrokeColor,
            strokeWidth: 2
        });
        endAnchor.position = _getEndAnchorPosition(8);
        _anchorGroup.addChild(endAnchor);

        for (var i = 0; i < _extraPoints.length; i++) {
            var pointAnchor = new paper.Path.Circle(
            {
                point: [0, 0],
                radius: 5,
                fillColor: _anchorFillColor,
                strokeColor: _anchorStrokeColor,
                strokeWidth: 2
            });
            pointAnchor.position = _extraPoints[i];
            _anchorGroup.addChild(pointAnchor);
        }
        _anchorGroup.bringToFront();
    };

    function _drawControls() {

        if (_controlGroup != null) {
            _controlGroup.remove();
        }

        _controlGroup = new paper.Group();

        var deleteControl = new paper.Group();
        var deleteBase = new paper.Path.Circle(
        {
            point: [0, 0],
            radius: 5,
            fillColor: "#ff0000",
            strokeColor: "#333",
            strokeWidth: 2
        });
        deleteControl.addChild(deleteBase);
        var deleteText = new paper.PointText(
        {
            point: [-2, 2],
            content: "X",
            fontSize: 6,
            strokeColor: "#333",
            fontFamily: "Arial",
        });
        deleteControl.addChild(deleteText);
        deleteControl.position = _getStartAnchorPosition(22);
        deleteControl.onClick = function (event) {
            _onDeleteClick();
        }
        _controlGroup.addChild(deleteControl);


        var addPointControl = new paper.Group();
        var addPointBase = new paper.Path.Circle(
        {
            point: [0, 0],
            radius: 5,
            fillColor: _anchorFillColor,
            strokeColor: _anchorStrokeColor,
            strokeWidth: 2
        });
        addPointControl.addChild(addPointBase);
        var addPointText = new paper.PointText(
        {
            point: [-3, 4],
            content: "+",
            fontSize: 11,
            strokeColor: _anchorStrokeColor,
            fontFamily: "Arial",
        });
        addPointControl.addChild(addPointText);

        var end = _endStep.getAnchorPoint(_endDirection);
        var start = _startStep.getAnchorPoint(_startDirection);
        if (_extraPoints.length > 0) {
            start = _extraPoints[_extraPoints.length - 1];
        }
        addPointControl.position = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2];

        addPointControl.onClick = function (event) {
            _onAddExtraPointClick();
        }

        _controlGroup.addChild(addPointControl);
        _controlGroup.bringToFront();
    };

    function _drawIntersections(links) {
        //TBD  Paper has a method for doing this.  Need to figure out the best way to get down to the link path level though...
        //var intersections = path1.getIntersections(path2);
        //for (var i = 0; i < intersections.length; i++) {
        //    new Path.Circle({
        //        center: intersections[i].point,
        //        radius: 5,
        //        fillColor: '#009dec'
        //    }).removeOnMove();
        //}
    };

    function _drawLinkTextBox() {

        if (_linkGroup.children.length == 1) {

            var linkText = new paper.Path.Rectangle(
            {
                point: [0, 0],
                size: [40, 12],
                strokeColor: _strokeColor,
                strokeWidth: 1,
                fillColor: "#ffffff",
                dashArray: [5, 7]
            });

            linkText.position = _textPosition();

            linkText.onClick = function (event) {
                _onTextDoubleClick();
            }

            _anchorGroup.addChild(linkText);
        }
    };

    function _exportLink() {

        return {
            startStepId: _startStep.id(),
            startDirection: _startDirection,
            endStepId: _endStep.id(),
            endDirection: _endDirection,
            text: _text,
            strokeColor: _strokeColor,
            strokeWidth: _strokeWidth,
            anchorStrokeColor: _anchorStrokeColor,
            anchorFillColor: _anchorFillColor,
            anchorHighlightColor: _anchorHighlightColor,
            extraPoints: _extraPoints,
            data: _data
        };

    };

    function _getAnchorPosition(startPt, endPt, distance) {

        var length = Math.sqrt(Math.pow((endPt[0] - startPt[0]), 2) + Math.pow((endPt[1] - startPt[1]), 2));
        var r = distance / length;

        return [(r * endPt[0] + (1 - r) * startPt[0]),
               (r * endPt[1] + (1 - r) * startPt[1])];
    };

    function _getEndAnchorPosition(distance) {

        var startPt, endPt = _endStep.getAnchorPoint(_endDirection);

        if (_extraPoints.length > 0) {
            startPt = _extraPoints[_extraPoints.length - 1];
        } else {
            startPt = _startStep.getAnchorPoint(_startDirection);
        }

        return _getAnchorPosition(endPt, startPt, distance);
    };

    function _getStartAnchorPosition(distance) {

        var endPt,startPt = _startStep.getAnchorPoint(_startDirection);

        if (_extraPoints.length > 0) {
            endPt = _extraPoints[0];
        } else {
            endPt = _endStep.getAnchorPoint(_endDirection);
        }

        return _getAnchorPosition(startPt, endPt, distance);
    };

    function _hideAnchors() {
        if (_anchorGroup != null) {
            _anchorGroup.remove();
            _anchorGroup = null;
        }
    };

    function _hideControls() {
        if (_controlGroup != null) {
            _controlGroup.remove();
            _controlGroup = null;
        }
    };

    function _highlightAnchorPoints(point) {

        var anchorHit = _anchorHitTest(point);

        if (_anchorGroup != null) {
            for (var i = 0; i < _anchorGroup.children.length; i++) {
                if (i == anchorHit) {
                    _anchorGroup.children[i].fillColor = _anchorHighlightColor;
                } else {
                    _anchorGroup.children[i].fillColor = _anchorFillColor;
                }
            }
        }
    };

    function _linkCenter() {
        var start = _startStep.getAnchorPoint(_startDirection);
        var end = _endStep.getAnchorPoint(_endDirection);

        return [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2];
    };

    function _removeLink() {
        if (_linkGroup != null) {
            _linkGroup.remove();
        }

        if (_anchorGroup != null) {
            _anchorGroup.remove();
        }

        if (_controlGroup != null) {
            _controlGroup.remove();
        }
    };

    function _setParams(params) {
        var properties = extendParams({
            startStep: _startStep,
            startDirection: _startDirection,
            endStep: _endStep,
            endDirection: _endDirection,
            text: _text,
            strokeColor: _strokeColor,
            strokeWidth: _strokeWidth,
            anchorStrokeColor: _anchorStrokeColor,
            anchorFillColor: _anchorFillColor,
            anchorHighlightColor: _anchorHighlightColor,
            extraPoints: _extraPoints,
            data: _data,
            onTextDoubleClick: _onTextDoubleClick,
            onDeleteClick: _onDeleteClick
        }, params);

        _startStep = properties.startStep;
        _startDirection = properties.startDirection;
        _endStep = properties.endStep;
        _endDirection = properties.endDirection;
        _text = properties.text;
        _strokeColor = properties.strokeColor;
        _strokeWidth = properties.strokeWidth;
        _anchorStrokeColor = properties.anchorStrokeColor;
        _anchorFillColor = properties.anchorFillColor;
        _anchorHighlightColor = properties.anchorHighlightColor;
        _extraPoints = properties.extraPoints;
        _data = properties.data;
        _onTextDoubleClick = properties.onTextDoubleClick;
        _onDeleteClick = properties.onDeleteClick

        _draw();
    };

    function _setText(text) {
        _text = text;
        _draw();
    };

    function _textPosition() {

        var start = _startStep.getAnchorPoint(_startDirection);
        var end = _endStep.getAnchorPoint(_endDirection);

        if (_extraPoints.length > 0) {
            var midIndex = Math.ceil(_extraPoints.length / 2);
            if (midIndex > 1) {
                start = _extraPoints[midIndex - 1];
                end = _extraPoints[midIndex];
            } else {
                end = _extraPoints[0];
            }
        }

        return [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2];
    };

    return {
        anchorHitTest: function (point) {
            return _anchorHitTest(point);
        },
        draw: function () {
            _draw();
        },
        drawAnchors: function () {
            _drawAnchors();
        },
        drawControls: function () {
            _drawControls();
        },
        drawIntersections: function () {
            _drawIntersections();
        },
        exportLink: function () {
            return _exportLink();
        },
        endStep: function (value) {
            if (arguments.length == 0) {
                return _endStep;
            } else {
                _endStep = value;
            }
        },
        endDirection: function (value) {
            if (arguments.length == 0) {
                return _endDirection;
            } else {
                _endDirection = value;
            }
        },
        extraPoints: function (value) {
            if (arguments.length == 0) {
                return _extraPoints;
            } else {
                _extraPoints = value;
            }
        },
        hideAnchors: function () {
            _hideAnchors();
        },
        hideControls: function () {
            _hideControls();
        },
        hideLinkGroup: function (val) {
            if (_linkGroup != null) {
                _linkGroup.visible = val;
            }
        },
        highlightAnchorPoints: function (point) {
            _highlightAnchorPoints(point);
        },
        id: function () {
            return _id;
        },
        linkHitTest: function (point, params) {

            if (_linkGroup != null) {
                return _linkGroup.hitTest(point, params);
            }

            return false;
        },
        removeLink: function () {
            _removeLink();
        },
        startDirection: function (value) {
            if (arguments.length == 0) {
                return _startDirection;
            } else {
                _startDirection = value;
            }
        },
        startStep: function (value) {
            if (arguments.length == 0) {
                return _startStep;
            } else {
                _startStep = value;
            }
        },
        setParams: function (params) {
            _setParams(params);
        },
        text: function (value) {
            if (arguments.length == 0) {
                return _text;
            } else {
                _text = value;
                _draw();
            }
        }
    };
};


var paperDiagram = function(Id) {

    var _canvas = null,
        _helper = null,
        _stepArray = [],
        _linkArray = [],
        _selectedStep = null,
        _linkDraw = null,
        _linkMove = null,
        _linkColor = "#9ED6FF",
        _mouseTool = null;

        _canvas = document.getElementById(Id);

        paper.setup(Id);
        paper.project.clear();
    
        //This helper object allows for calling into the diagram from steps and links
        _helper = {
            canvas: _canvas,
            getTextLines: function(text, maxWidth) {

                var lines = [];

                if (_canvas != null) {
                    var ctx = _canvas.getContext("2d");
                    var words = text.split(" ");
                    var currentLine = words[0];

                    for (var i = 1; i < words.length; i++) {
                        var word = words[i];
                        var width = ctx.measureText(currentLine + " " + word).width;
                        if (width < maxWidth) {
                            currentLine += " " + word;
                        } else {
                            lines.push(currentLine);
                            currentLine = word;
                        }
                    }
                    lines.push(currentLine);
                }

                return lines.join("\r\n");
            },
            getArrowLineSegments: function (startPt, extraPoints, endPt) {
                return _getArrowLineSegments(startPt, extraPoints, endPt);
            },
            getLinks: function () {
                return _linkArray;
            }

        };
       
        _mouseTool = new paper.Tool();

        _mouseTool.onMouseMove = function (event) {
            _anchorHitTest(event);
            _linkHitTest(event);
        }

        _mouseTool.onMouseDown = function (event) {

            var stepSelect = false;
            for (var i = 0; i < _stepArray.length; i++) {

                var direction = _stepArray[i].anchorHitTest(event.point);
                if (direction > -1) {

                    var okToAdd = true;
                    var outbound = _stepArray[i].maxOutboundLinks();
                    if (outbound > -1) {
                        if (_outboundLinks(_stepArray[i]) >= outbound) {
                            okToAdd = false;
                        }
                    }

                    if (okToAdd == true) {
                        _linkDraw = {
                            startStep: _stepArray[i],
                            startPoint: _stepArray[i].getAnchorPoint(direction),
                            startDirection: direction
                        };
                        stepSelect = true;
                    } else {
                        alert("Maximum number of outbound links for this step has been reached");
                        stepSelect = true;
                    }
                } else if (_stepArray[i].hitTest(event.point)) {
                    _selectedStep = _stepArray[i];
                    stepSelect = true;
                }
            }

            if (stepSelect != true) {
                for (var i = 0; i < _linkArray.length; i++) {
                    var anchor = _linkArray[i].anchorHitTest(event.point);
                    if (anchor > -1) {

                        _linkMove = {
                            selectedLink: _linkArray[i],
                            selectedLinkAnchor: anchor
                        };

                        _linkArray[i].hideLinkGroup(false);
                        break;
                    }
                }
            }
        }

        _mouseTool.onMouseDrag = function (event) {
            _anchorHitTest(event);

            if (_linkMove != null) {
                _linkMove.selectedLink.hideAnchors();
                _linkMove.selectedLink.hideControls();
            }
            //_linkHitTest(event);

            //Only allow one opeartion at a time.
            if (_linkDraw != null) {
                _linkDraw.Path = new paper.Path({
                    segments: _getArrowLineSegments(_linkDraw.startPoint, [],
                                                   [event.point.x, event.point.y]),
                    strokeColor: _linkColor,
                    strokeWidth: 3,
                    dashArray: [10, 2]
                }).removeOnDrag();

            } else if (_selectedStep != null) {
                _selectedStep.moveDelta(event.delta.x, event.delta.y);
                for (var i = 0; i < _linkArray.length; i++) {
                    if (_linkArray[i].startStep() == _selectedStep ||
                        _linkArray[i].endStep() == _selectedStep) {
                        _linkArray[i].draw();
                    }
                }
            } else if (_linkMove != null) {

                if (_linkMove.selectedLinkAnchor == 0) {
                    //Start Node Anchor Selected
                    _linkMove.Path = new paper.Path({
                        segments: _getArrowLineSegments([event.point.x, event.point.y], _linkMove.selectedLink.extraPoints(),
                                  _linkMove.selectedLink.endStep().getAnchorPoint(_linkMove.selectedLink.endDirection())),
                        strokeColor: _linkColor,
                        strokeWidth: 3,
                        dashArray: [10, 3]
                    }).removeOnDrag();
                } else if (_linkMove.selectedLinkAnchor == 1) {
                    //End Node Anchor Selected
                    _linkMove.Path = new paper.Path({
                        segments: _getArrowLineSegments(_linkMove.selectedLink.startStep().getAnchorPoint(_linkMove.selectedLink.startDirection()),
                                                       _linkMove.selectedLink.extraPoints(), [event.point.x, event.point.y]),
                        strokeColor: _linkColor,
                        strokeWidth: 3,
                        dashArray: [10, 2]
                    }).removeOnDrag();
                } else {
                    //extraPoint Anchor Selected
                    var extraPointIndex = _linkMove.selectedLinkAnchor - 2;

                    var ptArray = _linkMove.selectedLink.extraPoints();
                    ptArray[extraPointIndex] = [event.point.x, event.point.y];

                    _linkMove.selectedLink.extraPoints(ptArray);
                    _linkMove.selectedLink.draw();
                }
            }
        }

        _mouseTool.onMouseUp = function (event) {

            if (_linkDraw != null) {

                for (var i = 0; i < _stepArray.length; i++) {
                    var direction = _stepArray[i].anchorHitTest(event.point);
                    if (direction > -1) {

                        //Check to see if the max inbound links has been exceeded.
                        var okToAdd = true;
                        var inbound = _stepArray[i].maxInboundLinks();
                        if (inbound > -1) {
                            if (_inboundLinks(_stepArray[i]) >= inbound) {
                                okToAdd = false;
                            }
                        }

                        if (okToAdd) {
                            //loop through all the steps and find the correct step/anchor that we dropped this on
                            _addLink({
                                startStep: _linkDraw.startStep,
                                startDirection: _linkDraw.startDirection,
                                endStep: _stepArray[i],
                                endDirection: direction,
                                extraPoints: []
                            });
                        } else {
                            alert("Maximum number of inbound links for this step has been reached");
                        }
                        break;
                    }
                }

                //Remove the temporary path
                _linkDraw.Path.remove();
                _linkDraw = null;
            }

            if (_linkMove != null) {

                for (var i = 0; i < _stepArray.length; i++) {
                    var direction = _stepArray[i].anchorHitTest(event.point);
                    if (direction > -1) {

                        if (_linkMove.selectedLinkAnchor == 0) {
                            _linkMove.selectedLink.startStep(_stepArray[i]);
                            _linkMove.selectedLink.startDirection(direction);
                        } else {
                            _linkMove.selectedLink.endStep(_stepArray[i]);
                            _linkMove.selectedLink.endDirection(direction);
                        }

                        break;
                    }
                }

                //Remove the temporary path
                if (_linkMove.Path != null) {
                    _linkMove.Path.remove();
                }
                _linkMove.selectedLink.draw();
                _linkMove = null;
            }

            if (_selectedStep != null) {
                _selectedStep = null;
            }
        }

        function _anchorHitTest(event) {
            for (var i = 0; i < _stepArray.length; i++) {
                if (_stepArray[i].hitTest(event.point)) {
                    _stepArray[i].showAnchorPoints();
                    _stepArray[i].drawControls();
                    _stepArray[i].highlightAnchorPoints(_stepArray[i].anchorHitTest(event.point));
                } else {
                    _stepArray[i].hideAnchorPoints();
                    _stepArray[i].hideControls();
                }
            }
        };

        function _linkHitTest(event) {
            for (var i = 0; i < _linkArray.length; i++) {

                if (_linkArray[i].linkHitTest(event.point, {
                    stroke: true,
                    segments: true,
                    tolerance: 4
                })) {
                    _linkArray[i].drawAnchors();
                    _linkArray[i].drawControls();
                    _linkArray[i].highlightAnchorPoints(event.point);
                } else {
                    _linkArray[i].hideAnchors();
                    _linkArray[i].hideControls();
                }
            }
        };

        function _getArrowLineSegments(startPt, extraPoints, endPt) {

            var angleBegin = startPt;
            if (extraPoints.length > 0) {
                angleBegin = extraPoints[extraPoints.length - 1];
            }
            var angle = Math.atan2(endPt[1] - angleBegin[1], endPt[0] - angleBegin[0]);

            var segments = [];
            segments.push(startPt);

            for (var i = 0; i < extraPoints.length; i++) {
                segments.push(extraPoints[i]);
            }

            segments.push(endPt);

            segments.push([endPt[0] + 1 * Math.cos(angle), endPt[1] + 1 * Math.sin(angle)]);
            segments.push([endPt[0] - 7 * Math.cos(angle - Math.PI / 4), endPt[1] - 7 * Math.sin(angle - Math.PI / 4)]);
            segments.push([endPt[0] - 7 * Math.cos(angle + Math.PI / 4), endPt[1] - 7 * Math.sin(angle + Math.PI / 4)]);
            segments.push([endPt[0] + 1 * Math.cos(angle), endPt[1] + 1 * Math.sin(angle)]);

            //var segments = [startPt, endPt,
            //[endPt[0] + 1 * Math.cos(angle), endPt[1] + 1 * Math.sin(angle)],
            //[endPt[0] - 7 * Math.cos(angle - Math.PI / 4), endPt[1] - 7 * Math.sin(angle - Math.PI / 4)],
            //[endPt[0] - 7 * Math.cos(angle + Math.PI / 4), endPt[1] - 7 * Math.sin(angle + Math.PI / 4)],
            //[endPt[0] + 1 * Math.cos(angle), endPt[1] + 1 * Math.sin(angle)]];

            return segments;
        };

        function _inboundLinks(step) {
            var count = 0;

            for (var i = 0; i < _linkArray.length; i++) {
                if (_linkArray[i].endStep() == step) {
                    count++;
                }
            }

            return count;
        }

        function _outboundLinks(step) {
            var count = 0;

            for (var i = 0; i < _linkArray.length; i++) {
                if (_linkArray[i].startStep() == step) {
                    count++;
                }
            }

            return count;
        }

        function _newDiagram() {
            paper.project.clear();

            _stepArray = [];
            _linkArray = [];

            _selectedStep = null;
            _linkDraw = null;
        };

        function _addStep(params) {
            var step = diagramStep(_helper, generateUUID(), params)

            step.setParams({
                onDeleteClick: function () {
                    if (confirm("Delete Step From Diagram: " + step.text() + "?")) {
                        _removeStep(step);
                    }
                }
            });

            _stepArray.push(step);
            return step;
        };

        function _addLink (params) {
            var link = diagramLink(_helper, generateUUID(), params);

            link.setParams({
                onDeleteClick : function () {
                    if (confirm("Delete Link From Diagram: " + link.text() + "?")) {
                        _removeLink(link);
                    }
                }
            });

            _linkArray.push(link);
            return link;
        };

        function _removeLink(link) {
            link.removeLink();
            var index = _linkArray.indexOf(link);
            
            if (index > -1) {
                _linkArray.splice(index, 1);
            }
        };

        function _removeStep(step) {

            for (var i = _linkArray.length - 1; i >= 0 ; i--) {
                if (_linkArray[i].startStep() == step ||
                    _linkArray[i].endStep() == step) {
                    _linkArray[i].removeLink();
                    _linkArray.splice(i, 1);
                }
            }

            step.removeStep();
            var index = _stepArray.indexOf(step);
            
            if (index > -1) {
                _stepArray.splice(index, 1);
            }
        };

        function _export() {
            var model = {
                steps: [],
                links: []
            }

            for (var i = 0; i < _stepArray.length; i++)
            {
                model.steps.push(_stepArray[i].exportStep());
            }

            for (var i = 0; i < _linkArray.length; i++) {
                model.links.push(_linkArray[i].exportLink());
            }

            return model;
        };

        return {
            newDiagram: function() {
                _newDiagram();
            },
            addStep: function(params) {
                return _addStep(params);
            },
            addLink: function (params) {
                return _addLink(params);
            },
            getStep: function (stepId) {
                for (var i = 0; i < _stepArray.length; i++) {
                    if (_stepArray[i].id() == stepId) {
                        return _stepArray[i];
                    }
                }

                return null;
            },
            removeLink: function (link) {
                _removeLink(link);
            },
            exportModel: function () {
                return _export();
            },
        };   


};