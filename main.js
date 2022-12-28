// https://zhuanlan.zhihu.com/p/435839686
//https://zhuanlan.zhihu.com/p/435726094
/* ELSL部分 */
/*--------------------------------------------------------------------------------------------------- */
// 顶点着色器
var VSHADER_SOURCE = "" +
    "attribute vec3 a_Position;\n" +    //物体在世界坐标系下的坐标
    "uniform vec3 u_Color;\n" +              //物体基底颜色
    "uniform vec3 u_LightColor;\n" +          //入射光颜色
    "uniform vec4 u_LightPosition;\n" +   //光源位置坐标点
    "attribute vec3 a_Normal;\n" +  //法向量
    "uniform mat4 u_ModelViewMatrix;\n" + //模型视图矩阵
    "uniform mat4 u_ModelViewPersMatrix;\n" +//模型视图投影矩阵
    "varying vec4 v_color;\n" +         //漫反射后的rgb值
    "void main() {\n" +
    "   vec3 normal = normalize(a_Normal);\n" +    //归一化法向量
    "   vec4 targetPosition = u_ModelViewMatrix * vec4(a_Position, 1.0);\n" +//计算可观察点坐标位置
    "   vec3 light = normalize(vec3(u_LightPosition - targetPosition));\n" +   //归一化入射光线向量
    "   float dot = max(dot(light, normal), 0.0);\n" +   //归一化入射光线向量
    "   vec3 diffuse = u_LightColor * u_Color * dot;\n" +
    "   v_color = vec4(diffuse,1.0);\n" +
    "   gl_Position = u_ModelViewPersMatrix * vec4(a_Position, 1.0);\n" +    //为什么这里用ModelViewMatrix会没有数据？ 
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
// 声明js需要的相关变量
var canvas = document.getElementById("webgl");
var gl = getWebGLContext(canvas);

function main() {
    // 判断是否有效
    if (!gl) {
        console.log("你的浏览器不支持WebGL");
        return;
    }

    // 初始化着色器
    if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
        console.log("无法初始化着色器");
        return;
    }

    // 初始化顶点缓冲区
    var n = initVertexBuffer()

    // 进入场景初始化
    draw(n);
}

// 初始化顶点缓冲区
function initVertexBuffer() {
    //positions_存放实际顶点坐标
    let radius = 2;  //没用到 本质还是单位圆
    let latitudeBands = 50;//纬度带
    let longitudeBands = 50;//经度带
    let vertices_ = [];//存储x，y，z坐标
    let indices_ = [];//三角形列表（索引值）
    // let textureCoordData = [];//存储纹理坐标u，v，纹理坐标与顶点坐标一一对应
    let normals_ = []   //法向量，每个顶点有三个法向量

    for (var latNum = 0; latNum <= latitudeBands; latNum++) {
        var lat = latNum * Math.PI / latitudeBands;//纬度范围从0到π
        var sinLat = Math.sin(lat);
        var cosLat = Math.cos(lat);

        for (var longNum = 0; longNum <= longitudeBands; longNum++) {
            var lon = longNum * 2 * Math.PI / longitudeBands;//经度范围从0到2π
            var sinLon = Math.sin(lon);
            var cosLon = Math.cos(lon);

            //交换y和z
            var x = sinLat * cosLon
            var y = cosLat
            var z = sinLat * sinLon

            var u = (longNum / longitudeBands);//[0,1]的纬度格子
            var v = (latNum / latitudeBands);//[0,1]的经度格子

            vertices_.push(radius * x);
            vertices_.push(radius * y);
            vertices_.push(radius * z);
            normals_.push(x)
            normals_.push(y)
            normals_.push(z)
            // textureCoordData.push(u);
            // textureCoordData.push(v);
        }
    }

    // 索引数组 经度数*纬度数个面
    // 一个面要推进去六个点（一个面有四个点，要用三个三角形描述，共六个点
    for (var latNum = 0; latNum < latitudeBands; latNum++) {
        for (var longNum = 0; longNum < longitudeBands; longNum++) {
            var first = latNum * (longitudeBands + 1) + longNum;
            var second = first + longitudeBands + 1;

            indices_.push(first);
            indices_.push(second);
            indices_.push(first + 1);
            indices_.push(second);
            indices_.push(second + 1);
            indices_.push(first + 1);
        }
    }

    var position = new Float32Array(vertices_);
    var normals = new Float32Array(normals_)
    var indices = new Uint16Array(indices_);


    //创建缓冲区对象
    var vertexBuffer = gl.createBuffer();
    var normalBuffer = gl.createBuffer();
    var indexBuffer = gl.createBuffer();
    if (!vertexBuffer || !indexBuffer || !normalBuffer) {
        console.log("无法创建缓冲区对象");
        return -1;
    }
    //绑定缓冲区对象并写入顶点坐标数据
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, position, gl.STATIC_DRAW);

    //获取attribute -> a_Position变量的存储地址
    var a_Position = gl.getAttribLocation(gl.program, "a_Position");
    if (a_Position < 0) {
        console.log("无法获取顶点位置的存储变量");
        return -1;
    }
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);


    //绑定缓冲区对象并写入法向量坐标数据
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW);
    var a_Normal = gl.getAttribLocation(gl.program, "a_Normal");
    if (a_Normal < 0) {
        console.log("无法获取法向量的存储变量");
        return -1;
    }
    gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Normal);

    //将顶点索引数据写入缓冲区对象
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    return indices.length

}

var rotateAngle = 0.0
function draw(indices_length) {
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
    var modelViewMatrix = viewMatrix.multiply(modelMatrix)

    //模型视图投影矩阵
    var modeViewProjectMatrix = projMatrix.multiply(modelViewMatrix);

    //模型视图矩阵
    var u_ModelViewMatrix = gl.getUniformLocation(gl.program, 'u_ModelViewMatrix');
    gl.uniformMatrix4fv(u_ModelViewMatrix, false, modelViewMatrix.elements);

    //模型视图投影矩阵
    var u_ModelViewPersMatrix = gl.getUniformLocation(gl.program, 'u_ModelViewPersMatrix');
    gl.uniformMatrix4fv(u_ModelViewPersMatrix, false, modeViewProjectMatrix.elements);

    //光源位置
    let u_LightPosition = gl.getUniformLocation(gl.program, 'u_LightPosition');
    gl.uniform4fv(u_LightPosition, [10.0, 10.0, 10.0, 1.0]);

    //物体表面颜色
    let u_Color = gl.getUniformLocation(gl.program, 'u_Color');
    gl.uniform3fv(u_Color, [0.9, 0.5, 0.3]);

    //入射光颜色
    let u_LightColor = gl.getUniformLocation(gl.program, 'u_LightColor');
    gl.uniform3fv(u_LightColor, [1.0, 1.0, 1.0]);

    //开启隐藏面清除
    gl.enable(gl.DEPTH_TEST);

    //清空颜色和深度缓冲区
    // gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    // 指定清空<canvas>的颜色
    gl.clearColor(0.1, 0.1, 0.1, 1.0);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    //视口 左下 左下 宽度 高度
    // gl.viewport(canvas.width * 0.1, canvas.width * 0.1, canvas.width * 0.8, canvas.height * 0.8);

    //这里有个坑，Uint16Array 需要对应 UNSIGNED_SHORT
    // Uint8Array 需要对应 UNSIGNED_BYTE
    gl.drawElements(gl.TRIANGLES, indices_length, gl.UNSIGNED_SHORT, 0);

    // 自动旋转
    requestAnimationFrame(main)
    rotateAngle += 1.0
}