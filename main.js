// https://zhuanlan.zhihu.com/p/435839686
//https://zhuanlan.zhihu.com/p/435726094
/* ELSL部分 */
/*--------------------------------------------------------------------------------------------------- */
// 绘制球体的着色器
// 顶点着色器
var SPHERE_VSHADER_SOURCE = "" +
    "attribute vec3 a_Position;\n" +            //物体在世界坐标系下的坐标
    "uniform vec3 u_Color;\n" +                 //物体基底颜色
    "uniform vec3 u_LightColor;\n" +            //入射光颜色
    "uniform vec4 u_LightPosition;\n" +         //光源位置坐标点
    "attribute vec3 a_Normal;\n" +              //法向量
    "uniform mat4 u_ModelViewMatrix;\n" +       //模型视图矩阵
    "uniform mat4 u_ModelViewPersMatrix;\n" +   //模型视图投影矩阵
    "uniform mat4 u_ScaleMatrix;\n" +           //缩放矩阵
    "varying vec4 v_color;\n" +                 //漫反射后的rgb值
    "void main() {\n" +
    "   vec3 normal = normalize(a_Normal);\n" +    //归一化法向量
    "   vec4 targetPosition = u_ScaleMatrix * u_ModelViewMatrix * vec4(a_Position, 1.0);\n" +   //计算可观察点坐标位置
    "   vec3 light = normalize(vec3(u_LightPosition - targetPosition));\n" +    //归一化入射光线向量
    "   float dot = max(dot(light, normal), 0.0);\n" +                          //归一化入射光线向量
    "   vec3 diffuse = u_LightColor * u_Color * dot;\n" +
    "   v_color = vec4(diffuse,1.0);\n" +
    "   gl_Position = u_ScaleMatrix *  u_ModelViewPersMatrix * vec4(a_Position, 1.0);\n" +
    "}\n"

// 片段着色器
var SPHERE_FSHADER_SOURCE = "" +
    "#ifdef GL_ES\n" +
    " precision mediump float;\n" +
    "#endif\n" +
    "varying vec4 v_color;\n" +         //漫反射后的rgb值
    "void main() {\n" +
    "   gl_FragColor = v_color;\n" +
    "}\n"

// 绘制目标的着色器
var TARGET_VSHADER_SOURCE =
    'attribute vec4 a_Position;\n' +
    "uniform mat4 u_ModelViewPersMatrix;\n" +   //模型视图投影矩阵
    "uniform mat4 u_ScaleMatrix;\n" +           //缩放矩阵
    "uniform vec3 u_Color;\n" +
    "varying vec4 v_Color;\n" +
    'void main() {\n' +
    '  gl_Position = u_ScaleMatrix * u_ModelViewPersMatrix * a_Position;\n' +
    '  gl_PointSize = 10.0;\n' +
    '  v_Color = vec4(u_Color, 1.0);\n' +
    '}\n';

var TARGET_FSHADER_SOURCE =
    "#ifdef GL_ES\n" +
    " precision mediump float;\n" +
    "#endif\n" +
    "varying vec4 v_color;\n" +         //漫反射后的rgb值
    'void main() {\n' +
    '  gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);\n' +
    '}\n';

// 绘制目标文本的着色器
var TEXT_VSHADER_SOURCE =
    "attribute vec4 a_Position;\n" +
    "uniform mat4 u_ModelViewPersMatrix;\n" +
    "uniform mat4 u_ScaleMatrix;\n" +           //缩放矩阵
    "attribute vec2 a_TexCoord;\n" +
    "varying vec2 v_TexCoord;\n" +
    "void main(){\n" +
    "   gl_Position = u_ScaleMatrix * u_ModelViewPersMatrix * a_Position;\n" +
    "   v_TexCoord = a_TexCoord;\n" +
    "}\n"

var TEXT_FSHADER_SOURCE =
    "#ifdef GL_ES\n" +
    " precision mediump float;\n" +
    "#endif\n" +
    "uniform sampler2D u_Sampler;\n" +
    "varying vec2 v_TexCoord;\n" +
    "void main() {\n" +
    "   gl_FragColor = texture2D(u_Sampler, v_TexCoord);\n" +
    "}\n"


/* js部分 */
/*--------------------------------------------------------------------------------------------------- */
/* 控制面板 */
// 获取元素
var bt_roundscan = document.getElementById('roundscan')
var bt_sectorscan = document.getElementById('sectorscan')
var ip_startdirection = document.getElementById('startdirection')
var ip_enddirection = document.getElementById('enddirection')
var bt_starescan = document.getElementById('starescan')
var ip_staredirection = document.getElementById('staredirection')
var ip_starepitch = document.getElementById('starepitch')

// 工作模式相关参数
var isRoundScan = false                         // 周扫模式
var isSectorScan = false                        // 扇扫模式
var startDirection = 0                          // 起始方位角（扇扫模式下有效）
var endDirection = 360                          // 终止方位角（扇扫模式下有效）
var isAdd = true                                // 角度增加/减小（扇扫模式下有效）
var isStareScan = false                         // 凝视模式
var stareDirection = 0                          // 凝视方位角（凝视模式下有效）
var starePitch = 0                              // 凝视俯仰角（凝视模式下有效）

var MIN_DIRECTION = 0.0                         // 最小方位角
var MAX_DIRECTION = 360.0                       // 最大方位角

var MIN_PITCH = -90.0                           // 最小俯仰角
var MAX_PITCH = 90.0                            // 最大俯仰角

/* WebGL绘制 */
/*--------------------------------------------------------------------------------------------------- */
// 获取容器
var canvas = document.getElementById("webgl");
var gl = getWebGLContext(canvas);

// 绘制参数
var radius = 2;  //没用到 本质还是单位圆
// 绘制圆球的经度
var precision = 50;    //精度
// 经纬度
var latitudeBands = 10;//纬度带
var longitudeBands = 36;//经度带
// 绘制类型
var TRIANGLE_MODE = 'TRIANGLE'
var LINE_MODE = 'LINE'
var POINT_MODE = 'POINT'
// 旋转矩阵
var rotateAngle_X = 0.0   // 绕X轴旋转角度
var rotateAngle_Y = 0.0   // 绕Y轴旋转角度
var rotateAngle_Z = 0.0   // 绕Z轴旋转角度
// 缩放矩阵
var scale_X = 1.0   // 在X轴上的缩放因子
var scale_Y = 1.0   // 在Y轴上的缩放因子
var scale_Z = 1.0   // 在Z轴上的缩放因子
// 不同着色器
var sphereProgram = {}  //球体着色器
var targetProgram = {}  //目标着色器
var textProgram = {}  //文本着色器

/**
 * 主函数
 * @returns 
 */
function main() {
    // 初始化工作模式
    initControlMode()

    // 判断是否有效
    if (!gl) {
        console.log("你的浏览器不支持WebGL");
        return;
    }

    // 初始化球体着色器
    sphereProgram = createProgram(gl, SPHERE_VSHADER_SOURCE, SPHERE_FSHADER_SOURCE);
    // 初始化目标着色器
    targetProgram = createProgram(gl, TARGET_VSHADER_SOURCE, TARGET_FSHADER_SOURCE);
    // 初始化目标文本着色器
    textProgram = createProgram(gl, TEXT_VSHADER_SOURCE, TEXT_FSHADER_SOURCE);
    if (!sphereProgram || !targetProgram || !textProgram) {
        console.log("无法初始化着色器");
        return;
    }

    // 指定清空<canvas>的颜色
    gl.clearColor(0.15, 0.15, 0.15, 1.0);
    // 开启隐藏面清除
    gl.enable(gl.DEPTH_TEST);
    // 清空颜色和深度缓冲区
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    // 开启多边形偏移
    gl.enable(gl.POLYGON_OFFSET_FILL)

    // 绘制面型球体
    var obj = {}
    var indices_length = initSphereVertexBuffer(TRIANGLE_MODE, precision, precision, obj)
    initMatrix(obj)
    drawSphere(sphereProgram, indices_length, [0.9, 0.5, 0.3], TRIANGLE_MODE, obj);

    // 设置多边形偏移值
    gl.polygonOffset(0.00001, 0.00001);

    // 绘制线型球体
    // var obj = {}
    // var indices_length = initSphereVertexBuffer(LINE_MODE, latitudeBands, longitudeBands, obj)
    // initMatrix(obj)
    // drawSphere(sphereProgram, indices_length, [0.0, 0.0, 0.0], LINE_MODE, obj);

    // 绘制目标
    // 传入参数：弧度制纬度 弧度制精度 半径
    var tar1 = { direction: 30, pitch: 60, radius: 2 }  //目标1
    var tar2 = { direction: 45, pitch: 45, radius: 2 }  // 目标2
    var targetArray = [tar1, tar2]  //目标数组
    var obj = {}
    var targetPos = computeTargetPosition(targetArray)
    // var n = initTargetVertexBuffer(obj, tarpos);
    // initMatrix(obj)
    // drawTargets(targetProgram, n, [1.0, 0.0, 0.0], POINT_MODE, obj)

    // 绘制目标坐标
    for (let i = 0; i < targetPos.length; i = i + 3) {
        var obj = initTextVertexBuffer(targetPos[i], targetPos[i + 1], targetPos[i + 2])
        initMatrix(obj)
        var texture = initTextTextures(textProgram, i / 3 + 1)
        if (!texture) {
            console.log('初始化纹理信息失败')
            return
        }
        drawTargetBatch(textProgram, obj, texture)
    }
}


/**
 * 计算顶点索引数组
 * @param {*} type 绘制类型（面/线）
 * @param {*} pre1 绘制精度1
 * @param {*} pre2 绘制精度2
 * @returns 顶点索引数组
 */
function computeIndicesData(type, pre1, pre2) {
    let indicesData = [];//三角形列表（索引值）
    // 索引数组 经度数*纬度数个面
    for (var latNum = 0; latNum < pre1; latNum++) {
        for (var longNum = 0; longNum < pre2; longNum++) {
            //矩形第一行的第一个点索引，矩形第二行的第一个点索引
            var first = latNum * (pre2 + 1) + longNum;
            var second = first + pre2 + 1;
            // 索引值
            // 一个面要推进去六个点（一个面有四个点，要用三个三角形描述，共六个点
            if (type === TRIANGLE_MODE) {
                indicesData.push(first);
                indicesData.push(second);
                indicesData.push(first + 1);
                indicesData.push(second);
                indicesData.push(second + 1);
                indicesData.push(first + 1);
            } else if (type === LINE_MODE) {
                indicesData.push(first);
                indicesData.push(second);
                indicesData.push(second);
                indicesData.push(second + 1);
                indicesData.push(second + 1);
                indicesData.push(first + 1);
                indicesData.push(first + 1);
                indicesData.push(first);
            }
        }
    }
    return indicesData
}


/**
 * 转换坐标：球坐标系 -> WebGl坐标系
 * @param {*} theta 方位角
 * @param {*} phi 俯仰角
 * @param {*} radius 距离
 * @returns 坐标：x,y,z构成的对象
 */
function transformSphericalToWebGL(theta, phi, radius) {
    let { x, y, z } = transformSphericalToCartesian(theta, phi, radius)
    return transformCartesianToWebGL(x, y, z)
}


/**
 * 转换坐标：球坐标系 -> 笛卡尔坐标系
 * @param {*} theta 方位角[0,2pi]
 * @param {*} phi 俯仰角[0,pi]
 * @param {*} radius 距离
 * @returns 坐标：x,y,z构成的对象
 */
function transformSphericalToCartesian(theta, phi, radius) {
    var sint = Math.sin(theta)
    var cost = Math.cos(theta)
    var sinp = Math.sin(phi)
    var cosp = Math.cos(phi)
    var x = radius * sinp * cost
    var y = radius * sinp * sint
    var z = radius * cosp
    return { x: x, y: y, z: z }
}


/**
 * 转换坐标：笛卡尔坐标系 -> WebGl坐标系
 * @param {*} x X轴坐标值
 * @param {*} y Y轴坐标值
 * @param {*} z Z轴坐标值
 * @returns 坐标：x,y,z构成的对象
 */
function transformCartesianToWebGL(x, y, z) {
    return { x: y, y: z, z: x }
}


/**
 * 生成顶点坐标对象
 * @param {*} type 绘制类型（面/线）
 * @param {*} pre1 绘制精度1
 * @param {*} pre2 绘制精度2
 * @returns 顶点坐标对象（包含顶点坐标值数组、索引数组、法向量数组）
 */
function generateVertexCoordinate(type, pre1, pre2) {
    // 初始化存储数组
    let verticesData = [];//存储x，y，z坐标
    // let textureCoordData = [];//存储纹理坐标u，v，纹理坐标与顶点坐标一一对应
    let normalsData = []   //法向量，每个顶点有三个法向量
    // 经纬线交点即为点的个数
    for (let latNum = 0; latNum <= pre1; latNum++) {
        let lat = latNum * Math.PI / pre1;             // 纬度范围[0,π]
        for (let longNum = 0; longNum <= pre2; longNum++) {
            let lon = longNum * 2 * Math.PI / pre2;   // 经度范围[0,2π]
            // 计算顶点的坐标值
            if (type === TRIANGLE_MODE) {
                var { x, y, z } = transformSphericalToWebGL(lon, lat, radius)
            } else if (type === LINE_MODE) {
                var { x, y, z } = transformSphericalToWebGL(lon, lat, radius * 1.015)//为了解决深度冲突问题
            }
            // 映射纹理格子的坐标
            // let u = (longNum / longitudeBands);//[0,1]的纬度格子
            // let v = (latNum / latitudeBands);//[0,1]的经度格子
            // 逐一推入顶点数组
            verticesData.push(x);
            verticesData.push(y);
            verticesData.push(z);
            normalsData.push(x)
            normalsData.push(y)
            normalsData.push(z)
            // textureCoordData.push(u);
            // textureCoordData.push(v);
        }
    }

    // 计算索引数组
    let indicesData = computeIndicesData(type, pre1, pre2)

    return { verticesData: verticesData, indicesData: indicesData, normalsData: normalsData }

}


/**
 * 初始化球体的顶点缓冲区
 * @param {*} type 绘制类型（面/线）
 * @param {*} pre1 绘制精度1
 * @param {*} pre2 绘制精度2
 * @param {*} obj 数据存储对象
 * @returns 顶点个数
 */
function initSphereVertexBuffer(type = TRIANGLE_MODE, pre1, pre2, obj) {
    // 初始化顶点相关坐标
    let { verticesData, indicesData, normalsData } = generateVertexCoordinate(type, pre1, pre2)
    var vertices = new Float32Array(verticesData);
    var normals = new Float32Array(normalsData)
    var indices = new Uint16Array(indicesData);

    // 使用对象返回多个缓冲区
    obj.vertexBuffer = initArrayBufferForLaterUse(gl, vertices, 3, gl.FLOAT);
    obj.normalBuffer = initArrayBufferForLaterUse(gl, normals, 3, gl.FLOAT);
    obj.indexBuffer = initElementArrayBufferForLaterUse(gl, indices, gl.UNSIGNED_BYTE);//UNSIGNED_BYTE在？？？

    return indices.length

}


/**
 * 初始化矩阵数据
 * @param {*} obj 数据存储对象
 */
function initMatrix(obj) {
    //设置模型矩阵
    var modelMatrix = new Matrix4()
    modelMatrix.setRotate(rotateAngle_X, 1.0, 0.0, 0.0)
    modelMatrix.rotate(rotateAngle_Y, 0.0, 1.0, 0.0)
    modelMatrix.rotate(rotateAngle_Z, 0.0, 0.0, 1.0)

    //设置视图矩阵
    var viewMatrix = new Matrix4()
    viewMatrix.setLookAt(0.0, 0.0, 10.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0);

    //设置透视投影矩阵
    var projMatrix = new Matrix4();
    projMatrix.setPerspective(30, canvas.width / canvas.height, 0.1, 100.0);

    //设置模型视图矩阵
    obj.modelViewMatrix = viewMatrix.multiply(modelMatrix)

    //模型视图投影矩阵
    obj.modeViewProjectMatrix = projMatrix.multiply(obj.modelViewMatrix);

    //设置缩放矩阵
    var scaleMatrix = new Matrix4()
    scaleMatrix.setScale(scale_X, scale_Y, scale_Z)
    obj.scaleMatrix = scaleMatrix

}


/**
 * 转换角度：角度制 -> 弧度制
 * @param {*} angle 角度制角度
 * @returns 弧度制角度
 */
function transformAngleToRadian(angle) {
    return angle * Math.PI / 180
}

function computeTargetPosition(array) {
    // 目标点个数
    var n = array.length;
    var verticesData = []
    for (let i = 0; i < n; i++) {
        let direction = transformAngleToRadian(array[i].direction)
        let pitch = transformAngleToRadian(array[i].pitch)
        let radius = array[i].radius
        let { x, y, z } = transformSphericalToWebGL(direction, pitch, radius)
        verticesData.push(x, y, z)
    }
    return verticesData
}

/**
 * 初始化目标的顶点缓冲区
 * @param {*} obj 数据存储对象
 * @returns 顶点个数
 */
function initTargetVertexBuffer(obj, vertexdata) {
    var vertices = new Float32Array(vertexdata)

    // 适用对象返回缓冲区
    obj.vertexBuffer = initArrayBufferForLaterUse(gl, vertices, 3, gl.FLOAT);

    //返回点的个数
    return vertices.length / 3;
}


/**
 * 初始化文字的缓冲区对象
 * @param {*} xpos 文字的x坐标
 * @param {*} ypos 文字的y坐标
 * @param {*} zpos 文字的z坐标
 * @returns 缓冲区对象
 */
function initTextVertexBuffer(xpos, ypos, zpos) {
    var textSideWidth = 0.15
    var textSideHeight = 0.15
    var positions = [
        xpos - textSideWidth, ypos + textSideHeight, zpos,
        xpos - textSideWidth, ypos - textSideHeight, zpos,
        xpos + textSideWidth, ypos + textSideHeight, zpos,
        xpos + textSideWidth, ypos - textSideHeight, zpos
    ];
    var texCoords = [
        0.0, 1.0,
        0.0, 0.0,
        1.0, 1.0,
        1.0, 0.0,
    ];
    //创建缓冲区对象
    var obj = {}

    obj.vertexBuffer = initArrayBufferForLaterUse(gl, new Float32Array(positions), 3, gl.FLOAT)

    obj.texcoordBuffer = initArrayBufferForLaterUse(gl, new Float32Array(texCoords), 2, gl.FLOAT)

    return obj;
}

/**
 * 初始化缓冲区对象
 * @param {*} gl WebGL上下文
 * @param {*} data 数据
 * @param {*} num 一个点坐标由几个数据构成
 * @param {*} type 每个数据的类型(如gl.FLOAT)
 * @returns 缓冲区对象
 */
function initArrayBufferForLaterUse(gl, data, num, type) {
    var buffer = gl.createBuffer();
    if (!buffer) {
        console.log('无法创建缓冲区对象');
        return;
    }

    // 将数据写入缓冲区对象
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

    // 保留信息
    buffer.num = num;
    buffer.type = type;

    return buffer;
}


/**
 * 初始化索引缓冲区
 * @param {*} gl WebGL上下文
 * @param {*} data 数据
 * @param {*} type 每个数据的类型
 * @returns 
 */
function initElementArrayBufferForLaterUse(gl, data, type) {
    var buffer = gl.createBuffer();
    if (!buffer) {
        console.log('无法创建缓冲区对象');
        return;
    }

    // 将数据写入缓冲区
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data, gl.STATIC_DRAW);

    buffer.type = type;

    return buffer;
}


/**
 * 初始化attribute类型变量
 * @param {*} gl WebGL上下文
 * @param {*} a_attribute attribute变量名
 * @param {*} buffer 缓冲区
 */
function initAttributeVariable(gl, a_attribute, buffer) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    //TODO:
    // gl.vertexAttribPointer(a_attribute, buffer.num, buffer.type, false, 0, 0);
    gl.vertexAttribPointer(a_attribute, buffer.num, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_attribute);
}


/**
 * 绘制球体
 * @param {*} program 着色器名
 * @param {*} indices_length 点的个数
 * @param {*} color 颜色
 * @param {*} mode 绘制类型
 * @param {*} obj 数据存储对象 
 * @returns 是否绘制成功
 */
function drawSphere(program, indices_length, color, mode = TRIANGLE_MODE, obj) {
    // 开启着色器
    gl.useProgram(program);

    // 模型视图矩阵
    var u_ModelViewMatrix = gl.getUniformLocation(program, 'u_ModelViewMatrix');
    gl.uniformMatrix4fv(u_ModelViewMatrix, false, obj.modelViewMatrix.elements);

    // 模型视图投影矩阵
    var u_ModelViewPersMatrix = gl.getUniformLocation(program, 'u_ModelViewPersMatrix');
    gl.uniformMatrix4fv(u_ModelViewPersMatrix, false, obj.modeViewProjectMatrix.elements);

    // 缩放矩阵
    var u_ScaleMatrix = gl.getUniformLocation(program, 'u_ScaleMatrix');
    gl.uniformMatrix4fv(u_ScaleMatrix, false, obj.scaleMatrix.elements);

    // 光源位置
    let u_LightPosition = gl.getUniformLocation(program, 'u_LightPosition');
    gl.uniform4fv(u_LightPosition, [10.0, 10.0, 10.0, 1.0]);

    // 物体表面颜色
    let u_Color = gl.getUniformLocation(program, 'u_Color');
    gl.uniform3fv(u_Color, color);

    // 入射光颜色
    let u_LightColor = gl.getUniformLocation(program, 'u_LightColor');
    gl.uniform3fv(u_LightColor, [1.0, 1.0, 1.0]);

    //获取attribute -> a_Position变量的存储地址
    var a_Position = gl.getAttribLocation(program, "a_Position");
    if (a_Position < 0) {
        console.log("无法获取顶点位置的存储变量");
        return -1;
    }
    initAttributeVariable(gl, a_Position, obj.vertexBuffer)

    //绑定缓冲区对象并写入法向量坐标数据
    var a_Normal = gl.getAttribLocation(program, "a_Normal");
    if (a_Normal < 0) {
        console.log("无法获取法向量的存储变量");
        return -1;
    }
    initAttributeVariable(gl, a_Normal, obj.normalBuffer)

    //绑定索引缓冲区对象
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, obj.indexBuffer);

    // 绘制
    if (mode === TRIANGLE_MODE) {
        gl.drawElements(gl.TRIANGLES, indices_length, gl.UNSIGNED_SHORT, 0);
    } else if (mode === LINE_MODE) {
        gl.drawElements(gl.LINES, indices_length, gl.UNSIGNED_SHORT, 0);
    }

    // 自动旋转
    if (isRoundScan) {
        requestAnimationFrame(main)
        rotateAngle_Y = (rotateAngle_Y + 1.0) % 360.0
    }
    if (isSectorScan) {
        requestAnimationFrame(main)
        // 处于角度增加状态
        if (isAdd) {
            rotateAngle_Y = (rotateAngle_Y + 1.0) % 360.0
            if (rotateAngle_Y >= endDirection) {
                rotateAngle_Y = endDirection
                isAdd = false
            }
        } else {
            rotateAngle_Y = (rotateAngle_Y - 1.0) % 360.0
            if (rotateAngle_Y <= startDirection) {
                rotateAngle_Y = startDirection
                isAdd = true
            }
        }
    }
    if (isStareScan) {
        requestAnimationFrame(main)
        rotateAngle_Y = stareDirection
        rotateAngle_X = starePitch
    }

}


/**
 * 绘制目标
 * @param {*} program 着色器名
 * @param {*} n 点的个数
 * @param {*} color 颜色
 * @param {*} mode 绘制类型
 * @param {*} obj 数据存储对象
 * @returns 是否绘制成功
 */
function drawTargets(program, n, color, mode = POINT_MODE, obj) {
    // 开启着色器
    gl.useProgram(program)

    // 模型视图投影矩阵
    var u_ModelViewPersMatrix = gl.getUniformLocation(program, 'u_ModelViewPersMatrix');
    gl.uniformMatrix4fv(u_ModelViewPersMatrix, false, obj.modeViewProjectMatrix.elements);

    // 缩放矩阵
    var u_ScaleMatrix = gl.getUniformLocation(program, 'u_ScaleMatrix');
    gl.uniformMatrix4fv(u_ScaleMatrix, false, obj.scaleMatrix.elements);

    // 目标颜色
    let u_Color = gl.getUniformLocation(program, 'u_Color');
    gl.uniform3fv(u_Color, color);

    // 目标位置
    var a_Position = gl.getAttribLocation(program, 'a_Position');
    if (a_Position < 0) {
        console.log('Failed to get the storage location of a_Position');
        return -1;
    }
    initAttributeVariable(gl, a_Position, obj.vertexBuffer)

    //绘制
    if (mode === POINT_MODE) {
        gl.drawArrays(gl.POINTS, 0, n);
    }
}


/**
 * 绘制目标编号
 * @param {*} program 程序对象
 * @param {*} obj 缓冲区对象
 * @param {*} texture 纹理
 * @returns 
 */
function drawTargetBatch(program, obj, texture) {

    // 开启着色器
    gl.useProgram(program)

    // 模型视图投影矩阵
    var u_ModelViewPersMatrix = gl.getUniformLocation(program, 'u_ModelViewPersMatrix');
    gl.uniformMatrix4fv(u_ModelViewPersMatrix, false, obj.modeViewProjectMatrix.elements);

    // 缩放矩阵
    var u_ScaleMatrix = gl.getUniformLocation(program, 'u_ScaleMatrix');
    gl.uniformMatrix4fv(u_ScaleMatrix, false, obj.scaleMatrix.elements);

    // 目标位置
    var a_Position = gl.getAttribLocation(program, 'a_Position');
    if (a_Position < 0) {
        console.log('Failed to get the storage location of a_Position');
        return -1;
    }
    initAttributeVariable(gl, a_Position, obj.vertexBuffer)

    // 纹理
    var a_TexCoord = gl.getAttribLocation(program, 'a_TexCoord');
    if (a_TexCoord < 0) {
        console.log('Failed to get the storage location of a_TexCoord');
        return -1;
    }
    initAttributeVariable(gl, a_TexCoord, obj.texcoordBuffer)

    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

}


/**
 * 初始化文字纹理
 * @param {*} program 程序对象
 * @param {*} text 文字
 * @returns 文字纹理
 */
function initTextTextures(program, text) {
    // 获取采样器变量
    program.u_Sampler = gl.getUniformLocation(program, 'u_Sampler');
    if (!program.u_Sampler) {
        console.log('无法获取u_Sampler变量的存储地址');
        return false;
    }
    // 创建纹理对象
    var texture = gl.createTexture()
    if (!texture) {
        console.log('无法创建纹理对象');
        return false;
    }
    var canvas = document.createElement('canvas')
    if (!canvas) {
        console.log('无法创建canvas对象')
        return false
    }

    // 这里的宽高和什么对应的?
    canvas.width = 200
    canvas.height = 256
    // canvas.style.background = 'rgba(255, 255, 255, 0.0)'

    // 获取上下文
    var ctx = canvas.getContext('2d')
    if (!ctx) {
        console.log('无法获取2d上下文')
        return false
    }
    // 绘制矩形 起始点 矩形宽高
    ctx.fillStyle = 'yellow';//设置填充颜色
    // ctx.fillStyle = 'rgba(255,255,255,0.0)' //设置背景颜色为透明色
    ctx.strokeStyle = "red";
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // 设置文字的属性？
    ctx.textBaseline = 'middle';
    ctx.font = '120px bold sans-serif';
    ctx.fillStyle = 'rgba(200,0,0,1.0)'

    // 写一个文字
    var textwidth = ctx.measureText(text).width// 检查字体的宽度

    // 文字内容 开始绘制文本的x坐标 开始绘制文本的y坐标
    // x 的计算是居中绘制 y的计算大致是居中但是没有考虑文本高度
    ctx.fillText(text, (canvas.width - textwidth) / 2, canvas.height / 2)

    //配置纹理
    loadTexture(program, texture, program.u_Sampler, canvas)
    return texture;
}


/**
 * 配置纹理参数
 * @param {*} program 程序对象
 * @param {*} texture 纹理
 * @param {*} u_Sampler 采样器变量
 * @param {*} image 纹理图像
 */
function loadTexture(program, texture, u_Sampler, image) {
    //对纹理对象进行y轴反转
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1)   //纹理坐标系统的左下角是00 
    //开启0号纹理单元
    gl.activeTexture(gl.TEXTURE0)   //管理纹理图像 一张纹理图像对应一个纹理单元 使用之前要先激活
    //向target绑定纹理对象
    gl.bindTexture(gl.TEXTURE_2D, texture)  //纹理单元与纹理图像的绑定

    //配置纹理参数
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)//纹理图像如何分配给所选范围，设置参数，如何内插出片元
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)//纹理图像如何分配给所选范围，设置参数，如何内插出片元
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT)//纹理图像如何分配给所选范围，设置参数，如何内插出片元
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image)//传入图像，纹理图像就存储在webgl中

    //配置纹理图像
    gl.useProgram(program) //指定程序对象TODO:
    gl.uniform1i(u_Sampler, 0)  //usampler就是纹理单元编号
    gl.bindTexture(gl.TEXTURE_2D, null) //解绑纹理对象

}


/**
 * 创建程序对象
 * @param {*} gl webgl上下文
 * @param {*} vshader 顶点着色器
 * @param {*} fshader 片元着色器
 * @returns 程序对象
 */
function createProgram(gl, vshader, fshader) {
    //创建顶点着色器对象
    var vertexShader = loadShader(gl, gl.VERTEX_SHADER, vshader)
    //创建片元着色器对象
    var fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fshader)
    if (!vertexShader || !fragmentShader) {
        return null
    }

    //创建程序对象program
    var program = gl.createProgram()
    if (!gl.createProgram()) {
        return null
    }

    //分配顶点着色器和片元着色器到program
    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
    //链接program
    gl.linkProgram(program)

    //检查程序对象是否连接成功
    var linked = gl.getProgramParameter(program, gl.LINK_STATUS)
    if (!linked) {
        var error = gl.getProgramInfoLog(program)
        console.log('程序对象连接失败: ' + error)
        gl.deleteProgram(program)
        gl.deleteShader(fragmentShader)
        gl.deleteShader(vertexShader)
        return null
    }

    //返回程序program对象
    return program
}


/**
 * 加载着色器
 * @param {*} gl webgl上下文
 * @param {*} type 着色器类型（顶点/片元）
 * @param {*} source 着色器源码
 * @returns 着色器
 */
function loadShader(gl, type, source) {
    // 创建顶点着色器对象
    var shader = gl.createShader(type)
    if (shader == null) {
        console.log('创建着色器失败')
        return null
    }

    // 引入着色器源代码
    gl.shaderSource(shader, source)

    // 编译着色器
    gl.compileShader(shader)

    // 检查顶是否编译成功
    var compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS)
    if (!compiled) {
        var error = gl.getShaderInfoLog(shader)
        console.log('编译着色器失败: ' + error)
        gl.deleteShader(shader)
        return null
    }

    return shader
}

/**
 * 初始化工作模式
 */
function initControlMode() {
    // 绑定监听函数
    bt_roundscan.onclick = function () {
        isRoundScan = !isRoundScan
        isSectorScan = false
        isStareScan = false
        main()
    }
    bt_sectorscan.onclick = function () {
        isSectorScan = !isSectorScan
        isRoundScan = false
        isStareScan = false
        startDirection = formatInputAngle(Number(ip_startdirection.value), MIN_DIRECTION, MAX_DIRECTION)
        endDirection = formatInputAngle(Number(ip_enddirection.value), MIN_DIRECTION, MAX_DIRECTION)
        main()
    }
    bt_starescan.onclick = function () {
        isStareScan = !isStareScan
        isRoundScan = false
        isSectorScan = false
        stareDirection = formatInputAngle(Number(ip_startdirection.value), MIN_DIRECTION, MAX_DIRECTION)
        starePitch = formatInputAngle(Number(ip_starepitch.value), MIN_PITCH, MAX_PITCH)
        main()
    }
}

/**
 * 格式化输入角度
 * @param {*} angle 方位角
 * @param {*} min 最小角度范围
 * @param {*} max 最大角度范围
 * @returns 
 */
function formatInputAngle(angle, min, max) {
    angle = angle < min ? min : angle > max ? max : angle
    return angle
}
