console.log(
  '\n' + ' %c AWStats-Regulex %c https://github.com/lete114/AWStats-Theme-Regulex ' + '\n',
  'color: #80bdab; background: #333; padding:5px 0;',
  'background: #80bdab; padding:5px 0;'
)

function trim(s) {
  return s.replace(/^\s+/, '').replace(/\s+$/, '')
}

function getParams() {
  var params = location.hash
  if (!params || params.length < 2) {
    params = { embed: false, re: '', highlight: true, flags: '' }
  } else {
    params = params.slice(2)
    params = params.split('&').reduce(function (p, a) {
      a = a.split('=')
      p[a[0]] = a[1]
      return p
    }, {})
    params.embed = params.embed === 'true'
    params.flags = params.flags || ''
    params.re = params.re ? trim(decodeURIComponent(params.re)) : ''
  }
  return params
}

var params = getParams()
if (params.embed || params.cmd == 'export') {
  document.body.className += ' embed'
}

if (params.embed || params.cmd === 'export') {
  var embedFooterLink = document.getElementById('embedFooterLink')
  embedFooterLink.href = location.href.replace(/\bembed=true\b/gi, '').replace(/\bcmd=export\b/gi, '')
}

function $(id) {
  return document.getElementById(id)
}
function $$(q) {
  return document.querySelector(q)
}

window.addEventListener('DOMContentLoaded', function () {
  raphael = require('regulex').Raphael
  parse = require('regulex').parse
  visualize = require('regulex').visualize
  Kit = require('regulex').Kit
  init(raphael, visualize, parse, Kit)
})

function init(R, visualize, parse, K) {
  var paper = R('graphCt', 10, 10)
  var input = $('input')
  var inputCt = $('inputCt')
  var visualBtn = $('visualIt')
  var embedBtn = $('embedIt')
  var exportBtn = $('exportIt')
  var errorBox = $('errorBox')
  var flags = document.getElementsByName('flag')
  var flagBox = $('flagBox')
  var getInputValue = function () {
    return trim(input.value)
  }
  var setInputValue = function (v) {
    return (input.value = trim(v))
  }
  if (params.flags) {
    setFlags(params.flags)
  }
  if (params.re) {
    setInputValue(params.re)
  }
  visualIt()
  if (params.cmd == 'export') {
    showExportImage()
    return
  } else {
    initListeners()
    dragGraph($('graphCt'))
  }

  function visualIt(skipError) {
    var re = getInputValue()
    changeHash()
    hideError()
    var ret
    try {
      ret = parse(re)
    } catch (e) {
      if (e instanceof parse.RegexSyntaxError) {
        if (!skipError) {
          showError(re, e)
        }
      } else throw e
      return false
    }
    visualize(ret, getFlags(), paper)
    return true
  }

  function hideError() {
    errorBox.style.display = 'none'
  }
  function showError(re, err) {
    errorBox.style.display = 'block'
    var msg = ['Error:' + err.message, '']
    if (typeof err.lastIndex === 'number') {
      msg.push(re)
      msg.push(K.repeats('-', err.lastIndex) + '^')
    }
    setInnerText(errorBox, msg.join('\n'))
  }

  function serializeHash(params) {
    var re = getInputValue()
    var flags = getFlags()
    return (
      '#!' +
      (params.debug ? 'debug=true&' : '') +
      (params.cmd ? 'cmd=' + params.cmd + '&' : '') +
      (params.embed ? 'embed=true&' : '') +
      'flags=' +
      flags +
      '&re=' +
      encodeURIComponent((params.re = re))
    )
  }

  function changeHash() {
    location.hash = serializeHash(params)
  }

  function initListeners() {
    var LF = '\n'.charCodeAt(0),
      CR = '\r'.charCodeAt(0)
    input.addEventListener('keydown', onEnter)
    input.addEventListener('keyup', onKeyup)
    input.addEventListener('paste', function (evt) {
      var content = trim(evt.clipboardData.getData('text'))
      if (content[0] === '/' && /\/[img]*$/.test(content)) {
        evt.preventDefault()
        var endIndex = content.lastIndexOf('/')
        setFlags(content.slice(endIndex + 1))
        content = content.slice(1, endIndex)
        setInputValue(content)
      }
      setTimeout(visualIt, 50)
    })
    visualBtn.addEventListener('click', function () {
      visualIt()
    })
    embedBtn.addEventListener('click', function () {
      if (!visualIt()) return false
      var src = location.href
      var i = src.indexOf('#')
      src = i > 0 ? src.slice(0, i) : src
      changeHash()
      var re = getInputValue()
      var html =
        '<iframe frameborder="0" width="' +
        Math.ceil(paper.width) +
        '" height="' +
        Math.ceil(paper.height) +
        '" src="' +
        src +
        '#!embed=true&flags=' +
        getFlags() +
        '&re=' +
        encodeURIComponent(re) +
        '"></iframe>'
      window.prompt('Copy the html code:', html)
    })

    exportBtn.addEventListener('click', function () {
      showExportImage()
      /*
      为什么注释?
      因为默认会跳转到一个新的页面并传入hash
      我认为打开新页面是多余的
      */
      // var newParams = Object.assign({}, params)
      // newParams.cmd = 'export'
      // var hash = serializeHash(newParams)
      // window.open(location.href.split('#!')[0] + hash, '_blank')
    })

    /*
  window.addEventListener('hashchange',function () {
    if (manualHash) return;
    var p=getParams();
    if (p.re && p.re!==params.re) {
      params.re=p.re;
      setInputValue(p.re);
      visualIt();
    }
  });*/
    for (var i = 0, l = flags.length; i < l; i++) {
      flags[i].addEventListener('change', onChangeFlags)
    }

    function onChangeFlags(e) {
      setInnerText(flagBox, getFlags())
      visualIt()
      changeHash()
    }

    var onKeyupTid
    function onKeyup(e) {
      if (e.keyCode === LF || e.keyCode === CR) {
        return true
      }
      clearTimeout(onKeyupTid)
      onKeyupTid = setTimeout(function () {
        var skipError = true
        visualIt(skipError)
      }, 100)
    }
    function onEnter(e) {
      if (e.keyCode === LF || e.keyCode === CR) {
        e.preventDefault()
        e.stopPropagation()
        visualIt()
      }
    }
  }

  function getFlags() {
    var fg = ''
    for (var i = 0, l = flags.length; i < l; i++) {
      if (flags[i].checked) fg += flags[i].value
    }
    return fg
  }

  function setFlags(fg) {
    for (var i = 0, l = fg.length; i < l; i++) {
      if (~fg.indexOf(flags[i].value)) flags[i].checked = true
      else flags[i].checked = false
    }
    setInnerText(flagBox, fg)
  }

  function downloadImage(canvas) {
    /*
    为什么注释?
    因为默认会跳转到一个新的页面并传入hash
    我认为打开新页面是多余的
    */
    // $('download').onclick = function () {
    var value = prompt('请输入您需要下载的文件名和格式', 'Regulex.png')
    if (!value) return
    var image = ''

    if (value === 'svg') image = svgDataURL($$('#graphCt svg'))
    else image = canvas.toDataURL('image/' + value)

    var a = document.createElement('a')
    var event = new MouseEvent('click')
    a.download = value
    a.href = image
    a.dispatchEvent(event)
    // }
  }

  function showExportImage() {
    var ratio = window.devicePixelRatio || 1
    svg = graphCt.getElementsByTagName('svg')[0]
    var w = svg.clientWidth || parseInt(getComputedStyle(svg).width)
    var h = svg.clientHeight || parseInt(getComputedStyle(svg).height)
    var img = new Image()
    img.width = w
    img.height = h
    img.setAttribute('src', svgDataURL(svg))

    var canvas = document.createElement('canvas')

    canvas.width = w * ratio
    canvas.height = h * ratio
    canvas.style.width = w + 'px'
    canvas.style.height = h + 'px'
    canvas.className = 'exportCanvas'
    var ctx = canvas.getContext('2d')
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
    img.onload = function () {
      ctx.drawImage(img, 0, 0)
      /*
      为什么注释?
      因为默认会跳转到一个新的页面并传入hash
      我认为打开新页面是多余的
      */
      // graphCt.style.display = 'none'
      // document.body.appendChild(canvas)
      downloadImage(canvas)
    }
  }

  function svgDataURL(svg) {
    var svgAsXML = new XMLSerializer().serializeToString(svg)
    return 'data:image/svg+xml,' + encodeURIComponent(svgAsXML)
  }

  function dragGraph(g) {
    g.addEventListener('mousedown', startMove)

    function startMove(e) {
      clearSelect()
      var x = e.clientX,
        y = e.clientY
      g.addEventListener('mousemove', onMove)

      document.addEventListener('mouseup', unbind, true)
      window.addEventListener('mouseup', unbind, true)
      function unbind(e) {
        g.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', unbind, true)
        window.removeEventListener('mouseup', unbind, true)
      }

      function onMove(e) {
        var dx = x - e.clientX,
          dy = y - e.clientY
        if ((dx > 0 && g.scrollWidth - g.scrollLeft - g.clientWidth < 2) || (dx < 0 && g.scrollLeft < 1)) {
          document.documentElement.scrollLeft += dx
          document.body.scrollLeft += dx
        } else {
          g.scrollLeft += dx
        }
        if ((dy > 0 && g.scrollHeight - g.scrollTop - g.clientHeight < 2) || (dy < 0 && g.scrollTop < 1)) {
          document.documentElement.scrollTop += dy
          document.body.scrollTop += dy
        } else {
          g.scrollTop += dy
        }
        x = e.clientX
        y = e.clientY
      }
    }
  }

  function getInnerText(ele) {
    if (!ele) return ''
    var node = ele.firstChild,
      results = []
    if (!node) return ''
    do {
      if (node.nodeType === document.TEXT_NODE) results.push(node.nodeValue)
      else results.push(getInnerText(node))
    } while ((node = node.nextSibling))
    return results.join('')
  }
  function setInnerText(ele, s) {
    ele.innerHTML = ''
    var t = document.createTextNode('')
    t.nodeValue = s
    ele.appendChild(t)
    return s
  }

  function clearSelect() {
    if (window.getSelection) {
      if (window.getSelection().empty) {
        // Chrome
        window.getSelection().empty()
      } else if (window.getSelection().removeAllRanges) {
        // Firefox
        window.getSelection().removeAllRanges()
      }
    } else if (document.selection) {
      // IE
      document.selection.empty()
    }
  }
}
