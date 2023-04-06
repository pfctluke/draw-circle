// index.js
// const app = getApp()
const { envList } = require('../../envList.js');

Page({
  data: {
    baseImg: null,
    drawing: false,
    radiusCorrect: null,
    accuracyTotal: null,
    angleTotal: 0,
    directionStart: 0,
    centre: {
      x: 0,
      y: 0
    },
    last: {},
    canvas: null,
    context: null,
    highScore: 0,
    timeLimit: 0,
    soundDrawing: null,
    completions: 0,
    score: 0,
    levelDesc: {
      0: ["没想到真有人能得到这个分数"],
      1: ["我家猫都画不出这样！", "屏幕要被你画碎了！"],
      2: ["无语...", "你咋不上天呢"],
      3: ["咱还是去画三角形吧", "闭环！闭环！"],
      4: ["你这是用鸡爪画的吧", "画个圆有这么难吗"],
      5: ["数学及格过吗兄弟", "体育老师教的真不错"],
      6: ["手别抖啊兄弟", "没让你画椭圆", "唱歌颤音，画圈颤线"],
      7: ["一般一般，全国第三", "也就正常水平，不想形容", "怎么说呢，画的也还行吧"],
      8: ["你的手就是圆规吧！", "明天去教数学老师画圆", "你离满分只差一步", "开开心心生活，认认真真画圈"],
      9: ["圆圈大神请收下我的膝盖！", "会当凌绝顶，一览众圈小！", "计算机都没你画的圆", "圈圈圆圆圈圈，我的天！"],
      10: ["别开挂！"]
    }
  },

  onLoad() {
    const query = wx.createSelectorQuery()
    query.select('#myCanvas')
      .fields({ node: true, size: true })
      .exec(this.init.bind(this))

      wx.showToast({
        title: '成功',
        icon: 'success',
        duration: 2000
      })
      
    wx.showModal({
      content: '请围绕圆点画圆',
      showCancel: false,
      confirmText: "开始"
    })
  },

  init(res) {
    const width = res[0].width
    const height = res[0].height

    const canvas = res[0].node
    const context = canvas.getContext('2d')
    this.data.canvas = canvas
    this.data.ctx = context

    const dpr = wx.getSystemInfoSync().pixelRatio
    canvas.width = width * dpr
    canvas.height = height * dpr
    context.scale(dpr, dpr)

    this.data.centre.x = width / 2
    this.data.centre.y = width / 2
    
    console.log('canvas size: ', width, height)
    this.drawBackground()
    this.drawResult()
  },

  // 转发
  onShareAppMessage() {
    const promise = new Promise(resolve => {
      setTimeout(() => {
        resolve({
          title: `${this.data.score}分！${this.getLevelDesc()}`
        })
      }, 2000)
    })
    return {
      title: this.getLevelDesc(),
      promise 
    }
  },

  touchStart (e) {
    if (!e.touches[0] || this.data.drawing) return
    this.data.drawing = true
    const pos = e.touches[0]
    const ctx = this.data.ctx
    this.drawBackground()
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
    console.log('[touchStart] ', e)
    
    this.data.last.x = pos.x;
    this.data.last.y = pos.y;
    this.data.last.time = Date.now();
    this.data.last.speed = 0;
    this.data.last.accuracy = 1;
    this.data.last.dx = 0;
    this.data.last.dy = 0;
    this.data.last.angle = 180 + 180 * Math.atan2(pos.y - this.data.centre.y, pos.x - this.data.centre.x) / Math.PI;
    this.data.last.radius = Math.sqrt(Math.pow(pos.x - this.data.centre.x, 2) + Math.pow(pos.y - this.data.centre.y, 2));
    this.data.last.distance = 0;
    this.data.last.stroke = 20;
    this.data.radiusCorrect = this.data.last.radius;
    this.data.directionStart = 0;
    this.data.accuracyTotal = 0;
    this.data.angleTotal = 0;
  },

  touchMove (e) {
    if (!e.touches[0]) return
    if (!this.data.drawing) {
      return false;
    }
    const pos = e.touches[0]
    const ctx = this.data.ctx
    ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = "#f00"
    ctx.stroke()

    var time = Date.now();
    var dx = pos.x - this.data.last.x;
    var dy = pos.y - this.data.last.y;
    var distance = Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));
    if (distance < 6) {
        return false;
    }
    var speed = distance / (0.001 + time - this.data.last.time);
    if (this.data.last.distance == 0) {
      this.data.last.distance = distance;
    }
    if (this.data.last.speed == 0) {
      this.data.last.speed = speed;
    }
    var angle = 180 + 180 * Math.atan2(pos.y - this.data.centre.y, pos.x - this.data.centre.x) / Math.PI;
    var angleChange = angle - this.data.last.angle;
    if (angleChange < -180) {
        angleChange += 360;
    } else if (angleChange > 180) {
        angleChange -= 360;
    }
    var direction = (angleChange < 0) ? -1 : 1;
    if (this.data.directionStart == 0) {
        if (Math.abs(angleChange) < 0.1) {
            return false;
        }
        this.data.directionStart = direction;
    }
    var radius = Math.sqrt(Math.pow(pos.x - this.data.centre.x, 2) + Math.pow(pos.y - this.data.centre.y, 2));
    var accuracy = 1 - Math.abs((radius + this.data.last.radius) / 2 - this.data.radiusCorrect) / this.data.radiusCorrect;
    accuracy = Math.max(accuracy, 0);

    // 设置当前状态
    this.data.last.x = pos.x;
    this.data.last.y = pos.y;
    this.data.last.time = time;
    this.data.last.speed = speed;
    this.data.last.accuracy = accuracy;
    this.data.last.dx = dx;
    this.data.last.dy = dy;
    this.data.last.angle = angle;
    this.data.last.radius = radius;
    this.data.last.distance = distance;
    angleChange = Math.abs(angleChange);
    this.data.angleTotal += angleChange;
    if (this.data.angleTotal > 360) {
        angleChange = angleChange - (this.data.angleTotal - 360);
        this.data.angleTotal = 360;
    }
    this.data.accuracyTotal += angleChange * accuracy;

    const score = Math.round(1000 * this.data.accuracyTotal / this.data.angleTotal)
    console.log('score:', score)
    this.data.score = Math.round(score * score / 1000) / 10

    this.drawResult()

    if (this.data.angleTotal == 360) {
      this.endDraw()
      return;
    }

    if (pos.x > this.data.centre.x * 2 - 5 || pos.y > this.data.centre.x * 2 - 5) {
      this.endDraw()
      return
    }
  },

  touchEnd (e) {
    if (!this.data.drawing) {
      return false;
    }
    console.log('[touchEnd] ', e)
    this.endDraw()
  },

  endDraw () {
    this.data.drawing = false

    if (this.data.angleTotal <= 300) {
      this.data.score = Math.round(10 * this.data.score / 3) / 10
    }
    this.drawResult()
  },

  drawBackground () {
    const ctx = this.data.ctx
    const width = this.data.centre.x * 2

    ctx.beginPath()
    ctx.strokeStyle = "#b1b1b1"
    ctx.lineWidth = 5

    ctx.strokeRect(0, 0, width, width)
    
    ctx.fillStyle = '#fff'
    ctx.fillRect(2.5, 2.5, this.data.centre.x * 2 - 5, this.data.centre.x * 2 - 5)
    this.drawResult()

    ctx.fillStyle = '#000'
    ctx.arc(this.data.centre.x, this.data.centre.y, 5, 0, 2 * Math.PI)
    ctx.fill()
  },

  drawResult () {
    const ctx = this.data.ctx

    ctx.fillStyle = '#fff'
    ctx.fillRect(0, this.data.centre.y * 2, this.data.centre.x * 2, this.data.canvas.height - this.data.canvas.width)

    const score = this.data.score
    ctx.font = '34px Georgia'
    ctx.textAlign = 'center'
    ctx.fillStyle = `rgb(${255 - parseInt(2.55 * score)}, ${parseInt(2.55 * score)}, 0)`
    ctx.fillText(`${score}`, this.data.centre.x, this.data.centre.x * 2 + 50)

    if (this.data.drawing || this.data.score === 0) return
    ctx.font = '24px Georgia'
    ctx.fillText(`${this.getLevelDesc()}`, this.data.centre.x, this.data.centre.x * 2 + 100)
  },

  getLevelDesc() {
    const level = parseInt(this.data.score / 10)
    const levelTexts = this.data.levelDesc[level]
    const ranIndex = parseInt(Math.random() * levelTexts.length)
    return levelTexts[ranIndex]
  }
});
