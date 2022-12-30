// https://zhuanlan.zhihu.com/p/435839686
//https://zhuanlan.zhihu.com/p/435726094
/* ELSL部分 */
/*--------------------------------------------------------------------------------------------------- */
// 顶点着色器
var VSHADER_SOURCE = "" +
    "attribute vec3 a_Position;\n" +            //物体在世界坐标系下的坐标
    "uniform vec3 u_Color;\n" +                 //物体基底颜色
    "uniform vec3 u_LightColor;\n" +            //入射光颜色
    "uniform vec4 u_LightPosition;\n" +         //光源位置坐标点
    "attribute vec3 a_Normal;\n" +              //法向量
    "uniform mat4 u_ModelViewMatrix;\n" +       //模型视图矩阵
    "uniform mat4 u_ModelViewPersMatrix;\n" +   //模型视图投影矩阵
    "varying vec4 v_color;\n" +                 //漫反射后的rgb值
    "void main() {\n" +
    "   vec3 normal = normalize(a_Normal);\n" +    //归一化法向量
    "   vec4 targetPosition = u_ModelViewMatrix * vec4(a_Position, 1.0);\n" +   //计算可观察点坐标位置
    "   vec3 light = normalize(vec3(u_LightPosition - targetPosition));\n" +    //归一化入射光线向量
    "   float dot = max(dot(light, normal), 0.0);\n" +                          //归一化入射光线向量
    "   vec3 diffuse = u_LightColor * u_Color * dot;\n" +
    "   v_color = vec4(diffuse,1.0);\n" +
    "   gl_Position = u_ModelViewPersMatrix * vec4(a_Position, 1.0);\n" +
    "}\n"

// 片段着色器
var FSHADER_SOURCE = "" +
    "#ifdef GL_ES\n" +
    " precision mediump float;\n" +
    "#endif\n" +
    "varying vec4 v_color;\n" +         //漫反射后的rgb值
    "void main() {\n" +
    "   gl_FragColor = v_color;\n" +
    "}\n"

/* js部分 */
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
// 旋转矩阵绕Y轴的旋转角度
var rotateAngle = 0.0
// 不同着色器
var sphereProgram = {}  //球体着色器

/**
 * 主函数
 * @returns 
 */
function main() {
    // 判断是否有效
    if (!gl) {
        console.log("你的浏览器不支持WebGL");
        return;
    }

    // 初始化球体着色器
    sphereProgram = createProgram(gl, VSHADER_SOURCE, FSHADER_SOURCE);
    if (!sphereProgram) {
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
    var indices_length = initVertexBuffer(TRIANGLE_MODE, precision, precision, obj)
    initMatrix(obj)
    draw(sphereProgram, indices_length, [0.9, 0.5, 0.3], TRIANGLE_MODE, obj);

    // 设置多边形偏移值
    gl.polygonOffset(0.00001, 0.00001);

    // 绘制线型球体
    var obj = {}
    var indices_length = initVertexBuffer(LINE_MODE, latitudeBands, longitudeBands, obj)
    initMatrix(obj)
    draw(sphereProgram, indices_length, [0.0, 0.0, 0.0], LINE_MODE, obj);
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
 * 初始化顶点缓冲区
 * @param {*} type 绘制类型（面/线）
 * @param {*} pre1 绘制精度1
 * @param {*} pre2 绘制精度2
 * @param {*} obj 数据存储对象
 * @returns 顶点个数
 */
function initVertexBuffer(type = TRIANGLE_MODE, pre1, pre2, obj) {
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
    modelMatrix.setRotate(rotateAngle, 0.0, 1.0, 0.0)

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
    gl.vertexAttribPointer(a_attribute, buffer.num, buffer.type, false, 0, 0);
    gl.enableVertexAttribArray(a_attribute);
}


/**
 * 绘制
 * @param {*} program 着色器名
 * @param {*} indices_length 点的个数
 * @param {*} color 颜色
 * @param {*} type 每个数据的类型
 * @param {*} 数据存储对象 
 * @returns 是否绘制成功
 */
function draw(program, indices_length, color, type = TRIANGLE_MODE, obj) {
    // 开启着色器
    gl.useProgram(program);

    // 模型视图矩阵
    var u_ModelViewMatrix = gl.getUniformLocation(program, 'u_ModelViewMatrix');
    gl.uniformMatrix4fv(u_ModelViewMatrix, false, obj.modelViewMatrix.elements);

    // 模型视图投影矩阵
    var u_ModelViewPersMatrix = gl.getUniformLocation(program, 'u_ModelViewPersMatrix');
    gl.uniformMatrix4fv(u_ModelViewPersMatrix, false, obj.modeViewProjectMatrix.elements);

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


    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, obj.indexBuffer); //绑定索引

    // 绘制
    if (type === TRIANGLE_MODE) {
        gl.drawElements(gl.TRIANGLES, indices_length, gl.UNSIGNED_SHORT, 0);
    } else if (type === LINE_MODE) {
        gl.drawElements(gl.LINES, indices_length, gl.UNSIGNED_SHORT, 0);
    }

    // 自动旋转
    // requestAnimationFrame(main)
    // rotateAngle += 1.0
}