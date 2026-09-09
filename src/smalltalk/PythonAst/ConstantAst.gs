! ------------------- Superclass check
run
ExpressionAst ifNil: [self error: 'ExpressionAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for ConstantAst
expectvalue /Class
doit
ExpressionAst subclass: 'ConstantAst'
  instVarNames: #( value kind)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
ConstantAst comment: 
'Constant(constant value, string? kind)

A constant value. The value attribute of the Constant literal contains the Python object it represents.
The values represented can be simple types such as a number, string or None, but also immutable
container types (tuples and frozensets) if all of their elements are constant."'
%

expectvalue /Class
doit
ConstantAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from ConstantAst
removeallmethods ConstantAst
removeallclassmethods ConstantAst

set compile_env: 0

category: 'Grail-other'
method: ConstantAst
printSmalltalkOn: aStream

	value == true ifTrue: [
		aStream nextPutAll: 'true'.
		^self.
	].
	value == false ifTrue: [
		aStream nextPutAll: 'false'.
		^self.
	].
	value == nil ifTrue: [
		"Python ``None`` literal — emit a reference to the singleton bound
		in the Python dictionary, not Smalltalk ``nil``."
		aStream nextPutAll: 'None'.
		^self.
	].
	value == #'...' ifTrue: [
		"Python ``...'' literal.  The parser records it as the interned SYMBOL
		#'...' -- a compile-time MARKER, and the only Symbol-valued ConstantAst
		there is -- so identity against it cannot collide with a real string:
		a source ``'...''' parses to a String, never to the Symbol.

		Emit the GLOBAL, not the marker.  Emitting the marker is what made
		``type(...)'' answer Symbol and ``isinstance(..., str)'' answer True;
		the String branch below would otherwise claim it, since a GemStone Symbol
		IS a kind of String."
		aStream nextPutAll: 'Ellipsis'.
		^self.
	].
	(value isKindOf: PyStrSurrogate) ifTrue: [
		"A str holding a lone surrogate cannot be written as a Smalltalk
		string literal -- there is no Character for the code point, which is
		the whole reason this class exists.  Emit a CONSTRUCTOR instead, so
		the literal is rebuilt at run time from its code points."
		aStream nextPutAll: '(PyStrSurrogate @env0:___fromCodePoints___: #('.
		value ___codePoints___ doWithIndex: [:cp :i |
			i > 1 ifTrue: [aStream space].
			aStream print: cp].
		aStream nextPutAll: '))'.
		^self.
	].
	(value isKindOf: String) ifTrue: [
		aStream nextPutAll: value printString.
		^self.
	].
	(value isKindOf: ByteArray) ifTrue: [
		aStream nextPutAll: '#['.
		value doWithIndex: [:each :i |
			i > 1 ifTrue: [aStream nextPutAll: ' '].
			aStream print: each.
		].
		aStream nextPutAll: ']'.
		^self.
	].
	(value isKindOf: complex) ifTrue: [
		aStream
			nextPutAll: '(complex ___new___: ';
			print: (value @env1:real);
			nextPutAll: ' _: ';
			print: (value @env1:imag);
			nextPutAll: ')'.
		^self.
	].
	aStream print: value.
%

category: 'Grail-other'
method: ConstantAst
set: container to: anObject scope: aScope

	container
		set: value
		to: anObject.
%

category: 'Grail-IR Codegen'
method: ConstantAst
___irEligibleValueLocals___: localNames
	"The literal shapes ___emitIRValueOn___: reproduces: booleans, None, the
	Ellipsis marker, plain str / int / float / bytes, and -- since cut 80 -- the
	two shapes the text builds with a CONSTRUCTOR SEND rather than a literal,
	complex and PyStrSurrogate.

	Only the Ellipsis marker's own class is still refused.  #'...' is the one
	Symbol-valued constant the parser produces (a compile-time marker, handled
	just above), so any OTHER Symbol arriving here is not a Python literal at
	all and has no text emit to reproduce -- printSmalltalkOn: would fall
	through to ``print: value'' and write a bare identifier."

	(value == true or: [value == false or: [value == nil]]) ifTrue: [^ true].
	"The Ellipsis marker (cut 68): the text emits the GLOBAL ``Ellipsis''."
	value == #'...' ifTrue: [^ true].
	"Both of these emit a send, not a literal -- see ___emitIRValueOn___:.  The
	surrogate test must stay AHEAD of the String one below it: PyStrSurrogate is
	a kind of String, and the String branch answers with a plain literal, which
	is exactly the emit that cannot represent it."
	(value isKindOf: PyStrSurrogate) ifTrue: [^ true].
	(value isKindOf: complex) ifTrue: [^ true].
	(value isKindOf: Symbol) ifTrue: [^ false].
	(value isKindOf: String) ifTrue: [^ true].
	(value isKindOf: ByteArray) ifTrue: [^ true].
	(value isKindOf: Integer) ifTrue: [^ true].
	(value isKindOf: Float) ifTrue: [^ true].
	^ false
%

category: 'Grail-IR Codegen'
method: ConstantAst
___emitIRValueOn___: aBuilder
	"Reproduce printSmalltalkOn:'s literal cases as IR nodes.

	Two of them are not literals.  A lone-surrogate str and a complex cannot be
	written as a Smalltalk literal at all -- there is no Character for a
	surrogate code point, and no literal syntax for a complex -- so the text
	emits a CONSTRUCTOR SEND for each, and so does this (cut 80).  The receiver,
	selector, argument shape and SEND ENVIRONMENT are read off
	printSmalltalkOn: rather than chosen: ``@env0:___fromCodePoints___:'' is an
	env-0 send and ``___new___: _:'' an env-1 one, and an env mismatch is not a
	compile error -- it dispatches into the wrong method dictionary at run time.

	The two arguments travel as the OBJECTS the parser already holds, where the
	text has to print them and have the compiler read them back. That is
	strictly safer, not merely shorter: a Float literal's round trip through
	printString is the one place this emit could disagree with the text about a
	value, and passing the Float itself removes the question."

	aBuilder atNode: self.
	value == true ifTrue: [^ aBuilder trueLit].
	value == false ifTrue: [^ aBuilder falseLit].
	value == nil ifTrue: [^ aBuilder globalNamed: #None].
	value == #'...' ifTrue: [^ aBuilder globalNamed: #Ellipsis].
	(value isKindOf: PyStrSurrogate) ifTrue: [
		| cps |
		"``#(cp cp ...)'' in the text is a literal array, which the Smalltalk
		compiler makes invariant; match that, so the constructor cannot be
		handed something a later reader could mutate."
		cps := Array withAll: value ___codePoints___.
		cps immediateInvariant.
		aBuilder atNode: self.
		^ aBuilder
			send: #'___fromCodePoints___:'
			to: (aBuilder globalNamed: #PyStrSurrogate)
			with: { aBuilder obj: cps }
			env: 0].
	(value isKindOf: complex) ifTrue: [
		| re im |
		re := aBuilder obj: (value @env1:real).
		im := aBuilder obj: (value @env1:imag).
		"Stamped LAST, after both arguments exist: a stamp is consumed by the
		next send the builder makes, so building an argument after it would
		relabel this send with the argument's position."
		aBuilder atNode: self.
		^ aBuilder
			send: #'___new___:_:'
			to: (aBuilder globalNamed: #complex)
			with: { re. im }
			env: 1].
	^ aBuilder obj: value
%

category: 'Grail-other'
method: ConstantAst
value

	^value
%

category: 'Grail-annotations'
method: ConstantAst
___annotationSourceString___
	"A string-literal annotation (a forward reference like def
	f(x: Foo) written with Foo quoted) carries its content verbatim --
	CPython stores the forward-reference string.  None/other literals
	stringify.

	Booleans render PYTHON-side: Smalltalk printString gives ``true''
	where Python source says ``True'', and this text is read back as
	Python source -- inspect.signature prints it for a default, so
	``def f(c=True)'' must render ``c=True''."

	(value isKindOf: CharacterCollection) ifTrue: [^ value asString].
	value isNil ifTrue: [^ 'None'].
	value == true ifTrue: [^ 'True'].
	value == false ifTrue: [^ 'False'].
	^ value printString
%
method: ConstantAst
value: newValue
	value := newValue
%
method: ConstantAst
kind
	^kind
%
method: ConstantAst
kind: newValue
	kind := newValue
%

category: 'Grail-annotations'
method: ConstantAst
___defaultSourceString___
	"A literal default renders as its PYTHON REPR, which for a string means
	QUOTED.  ___annotationSourceString___ deliberately strips the quotes -- an
	annotation's string literal is a forward reference whose content IS the name
	-- so a default taking that path rendered a='abc' as a=abc, and the empty
	string as nothing at all after the equals sign.

	Quote choice follows repr: single quotes normally, DOUBLE quotes when the
	value itself contains a single quote.  That avoids emitting a backslash
	escape and is what CPython prints for these cases."

	| str |
	(value isKindOf: CharacterCollection) ifFalse: [
		^ self ___annotationSourceString___].
	str := value asString.
	(str includes: $') ifTrue: [
		| dq |
		dq := String with: $".
		^ dq , str , dq].
	^ (String with: $') , str , (String with: $')
%

category: 'Grail-IR Codegen'
method: ConstantAst
___irRefusalDetail___: localSet
	(value isKindOf: PyStrSurrogate) ifTrue: [^ #'ConstantAst:surrogateStr'].
	(value isKindOf: Symbol) ifTrue: [^ #'ConstantAst:Symbol'].
	^ ('ConstantAst:' , value class name asString) asSymbol
%
