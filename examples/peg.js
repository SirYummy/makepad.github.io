
var def = {
	Root    :p=>p.Form,
	//ws      :p=>p.fold(p=>p.any(p=>p.eat(' ') || p.eat('\t'))),
	Form    :p=>p('form') && p.many(p=>p.eat(' ')) && p.Id && p.ws && p.Body,
	Body    :p=>p.ws && p('{') && p.eat('\n') && 
		p.any(p=>p.Answer || p.Question || p.If) && 
		p.ws && p('}') && p.ws && p.many(p=>p.eat('\n')),
	Question:p=>p.ws && p.String && p.ws && p.eat('\n') && 
		p.ws && p.Id && p.eat(':') && p.ws && p.Type && p.eat('\n'),
	Answer  :p=>p.ws && p.String && p.ws && p.eat('\n') && 
		p.ws && p.Id && p.eat(':') && p.ws && p.Type && p.ws && p.eat('=') && p.ws && p.eat('\n') && 
		p.ws && p.Expr && p.eat('\n'),
	If      :p=>p.ws && p('if') && p.ws && p('(') && p.ws && p.Logic && p.ws && p(')') && p.Body,
	String  :p=>p('"') && p.any(p=>p.not('"')) && p('"'),
	Type    :p=>(p('boolean') || p('money')),
	Id      :p=>(p('a', 'z') || p('A', 'Z')) && p.any(p=>p('a', 'z') || p('A', 'Z') || p('0', '9')),
	
	Logic   :p=>p.fold(p=>p.Or),
	Or      :p=>p.fold(p=>p.And && p.any(p=>p.ws && p('||') && p.ws && p.And)),
	And     :p=>p.fold(p=>p.LogicP && p.any(p=>p.ws && p('&&') && p.ws && p.LogicP)),
	LogicP  :p=>p.fold(p=>p.Id || p('(') && p.Logic && p(')')),
	
	Expr    :p=>p.fold(p=>p.Sum),
	Sum     :p=>p.fold(p=>p.Prod && p.any(p=>p.ws && (p('+') || p('-')) && p.ws && p.Prod)),
	Prod    :p=>p.fold(p=>p.ExprP && p.any(p=>p.ws && (p('*') || p('/')) && p.ws && p.ExprP)),
	ExprP   :p=>p.fold(p=>p.Id || p('(') && p.Expr && p(')'))
}

new require('styles/dark')
module.exports = class extends require('base/drawapp'){ //top
	constructor() {
		super()
		this.form = 
		'form taxOfficeExample {\n' + 
			'  "Did you sell a house in 2010?"\n' + 
			'    hasSoldHouse: boolean\n' + 
			'  if(hasSoldHouse) {\n' + 
			'    "What was the selling price?"\n' + 
			'      sellingPrice: money\n' + 
			'    "Private debts for the sold house:"\n' + 
			'      privateDebt: money\n' + 
			'    "Value residue:"\n' + 
			'      valueResidue: money = \n' + 
			'        (sellingPrice - privateDebt)\n' + 
			'  }\n' + 
			'}\n'
	}
	onDraw() {
		var p = makeParser(def)
		var dt = Date.now()
		for(var i = 0;i < 100;i++){
			var ast = p.parse(this.form)
		}
		_=Date.now() - dt
		if(!ast) {
			this.drawText({
				fontSize:20,
				text    :"Parse error, expected:" + p.lastKey + " at: ..." + this.form.slice(p.last - 10, p.last) + '^' + this.form.slice(p.last, p.last + 10) + '...'
			})
			return
		}
		var recur = (node, d) =>{
			this.drawText({
				fontSize:8,
				x       :d * 10,
				text    :node.type + ':' + node.value
			})
			this.lineBreak()
			for(let i = 0;i < node.n.length;i++){
				recur(node.n[i], d + 1)
			}
		}
		recur(ast, 0)
	}
}

function makeParser(rules) {
	
	function p(a, b, eat, not) {
		var input = p.input
		if(typeof b === 'string') { // range
			var c = input.charCodeAt(p.pos)
			var cin = c >= a.charCodeAt(0) && c <= b.charCodeAt(0)
			if(not && !cin || !not && cin) {
				if(!eat) p.ast.value += input.charAt(p.pos)
				p.pos++
				return true
			}
			return false
		}
		var s = ''
		for(var i = 0, pos = p.pos;i < a.length;i++,pos++){ // string match
			s += input.charAt(pos)
			var cin = input.charCodeAt(pos) !== a.charCodeAt(i)
			if(not && !cin || !not && cin) return false
		}
		if(!eat) p.ast.value += s
		if(pos > p.last) p.last = pos,p.lastKey = p.key
		p.pos = pos
		return true
	}
	
	p.parse = function(input) {
		p.input = input
		p.pos = 0
		p.last = 0
		var ast = p.ast = {n:[]}
		p.Root
		return ast.n[0]
	}
	
	p.fold = function(fn) {
		if(fn(p)) {
			if(p.ast.n.length < 2) return 0
			return true
		}
		return false
	}
	
	p.eat = function(a, b) {
		return p(a, b, true)
	}
	
	p.__defineGetter__('ws', function() {
		while(p.input.charCodeAt(p.pos) === 32 || p.input.charCodeAt(p.pos) === 9){
			p.pos++
		}
		return true
	})
	
	p.any = function(fn) { //zero or more
		while(fn(p)){}
		return true
	}
	
	p.many = function(fn) { //one or more
		var c = 0
		while(fn(p)){c++}
		return c !== 0
	}
	
	p.opt = function(fn) { //zero or one
		fn(p)
		return true
	}
	
	p.not = function(fn, b) {
		if(typeof fn === 'string') return p(fn, b, false, true)
		var pos = p.pos, ret = fn(p)
		p.pos = pos
		return !ret
	}
	
	p.group = function(fn) {
		var pos = p.pos, ret = fn(p)
		if(!ret) p.pos = pos
		return ret
	}
	
	for(var key in rules){
		p.__defineGetter__(key, function(key) {
			var rule = rules[key]
			var parent = p.ast
			var mine = p.ast = {type:key, n:[], value:'', start:pos}
			var pos = p.pos
			p.key = key
			var ret = rule(p)
			p.ast = parent
			if(ret === true) {
				mine.end = pos
				parent.n.push(mine)
				return true
			}
			else if(ret === 0) {
				var sub = mine.n[0]
				if(sub) parent.n.push(mine.n[0])
				return true
			}
			else {
				p.pos = pos
			}
			return false
		}.bind(this, key))
	}
	
	return p
}
