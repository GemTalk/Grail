"ClassBuildTextEmitter writes the class build exactly as ClassDefAst wrote it
inline before the ClassBuildEmitter interface existed.  These pin each
operation's spelling; the whole-corpus proof is the trace diff the change was
made under (GRAIL_CODEGEN_TRACE_DIR before and after, zero bytes changed)."
Class {
	#name : 'ClassBuildTextEmitterTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
ClassBuildTextEmitterTestCase >> ___lf___ [

	^ String with: Character lf

]

{ #category : 'Grail-Helpers' }
ClassBuildTextEmitterTestCase >> ___textOf___: aOneArgBlock [
	"What aOneArgBlock writes through a text emitter on a fresh codegen stream."

	| s |
	s := PrettyWriteStream on: Unicode7 new.
	aOneArgBlock value: (ClassBuildTextEmitter on: s).
	^ s contents

]

{ #category : 'Grail-Tests' }
ClassBuildTextEmitterTestCase >> testACloseOfTheWrongKindIsRefused [
	"The open/close pairs are a stack, and a close must match its open: an
	unbalanced build fails at the emit rather than as a compile error in the
	generated text."

	self should: [
		self ___textOf___: [:e |
			e openValueBlock: #('X').
			e closeIfTrue]]
		raise: Error.
	self should: [
		self ___textOf___: [:e |
			e openIfTrue: [e var: 'X'].
			e assertDepth: 0]]
		raise: Error.
	self assert: (self ___textOf___: [:e |
			e openIfTrue: [e var: 'c'].
			e assertDepth: 1.
			e closeIfTrue.
			e assertDepth: 0])
		equals: 'c ifTrue: [' , self ___lf___ , '].' , self ___lf___

]

{ #category : 'Grail-Tests' }
ClassBuildTextEmitterTestCase >> testBlocksAndConditionals [

	| lf |
	lf := self ___lf___.
	self assert: (self ___textOf___: [:e |
			e openValueBlock: #('X' '___t_1').
			e statementWithoutNewline: [e assign: 'X' from: [e integer: 1]].
			e closeValueBlock])
		equals: '[| X ___t_1 | X := 1.] @env0:value.' , lf.
	self assert: (self ___textOf___: [:e |
			e openValueBlockLine: #('X').
			e closeValueBlockLine])
		equals: '[ | X |' , lf , ' ] @env0:value.' , lf.
	self assert: (self ___textOf___: [:e |
			e
				ifTrue: [e paren: [e send: #isBehavior env: 0 to: [e var: 'X']]]
				inline: [e send: #'___grailBindClassCell___' env: 1 to: [e var: 'X']]])
		equals: '(X @env0:isBehavior) ifTrue: [X @env1:___grailBindClassCell___].' , lf

]

{ #category : 'Grail-Tests' }
ClassBuildTextEmitterTestCase >> testCascadeAndBraces [

	self assert: (self ___textOf___: [:e |
			e cascadeTo: [e paren: [e send: #new env: 0 to: [e var: 'PyDict']]]
				sends: {
					{#'at:put:'. {[e string: 'x']. [e string: 'int']}. 0}.
					{#yourself. #(). 0}}])
		equals: '(PyDict @env0:new) @env0:at: ''x'' put: ''int''; @env0:yourself'.
	self assert: (self ___textOf___: [:e |
			e braceArray: {[e symbol: 'a']. [e symbol: 'b']}])
		equals: '{ #''a''. #''b'' }'.
	self assert: (self ___textOf___: [:e | e braceArray: #()]) equals: '{  }'.
	self assert: (self ___textOf___: [:e |
			e compactBraceArray: {[e compactBraceArray: {[e string: 'p']. [e string: 'q']}]}])
		equals: '{{''p''. ''q''}}'

]

{ #category : 'Grail-Tests' }
ClassBuildTextEmitterTestCase >> testLiteralSpellings [

	self assert: (self ___textOf___: [:e | e string: 'it''s']) equals: '''it''''s'''.
	self assert: (self ___textOf___: [:e | e symbol: '__doc__']) equals: '#''__doc__'''.
	self assert: (self ___textOf___: [:e | e plainSymbol: 'withAll:']) equals: '#withAll:'.
	self assert: (self ___textOf___: [:e | e symbolArray: #('a' '_' 'b')]) equals: '#( a #''_'' b )'.
	self assert: (self ___textOf___: [:e | e symbolArray: #()]) equals: '#( )'.
	self assert: (self ___textOf___: [:e | e emptyArray]) equals: '#()'.
	self assert: (self ___textOf___: [:e | e symbolPairArray: #(#('a' 'b'))]) equals: '#( #( a b ) )'.
	self assert: (self ___textOf___: [:e | e quotedSymbolArray: #('a' 'b')]) equals: '#( #''a'' #''b'' )'.
	self assert: (self ___textOf___: [:e | e stringArray: #('a' 'b')]) equals: '#( ''a'' ''b'' )'.
	self assert: (self ___textOf___: [:e | e compactStringArray: #('T' 'U')]) equals: '#(''T'' ''U'' )'.
	self assert: (self ___textOf___: [:e | e boolean: false]) equals: 'false'.
	self assert: (self ___textOf___: [:e | e nilLiteral]) equals: 'nil'.
	self assert: (self ___textOf___: [:e | e curPos: 12]) equals: '___curPos___ := 12.' , self ___lf___

]

{ #category : 'Grail-Tests' }
ClassBuildTextEmitterTestCase >> testSends [

	self assert: (self ___textOf___: [:e |
			e send: #'___grailCompileSlotIndexTable___' env: nil to: [e var: 'X']])
		equals: 'X ___grailCompileSlotIndexTable___'.
	self assert: (self ___textOf___: [:e |
			e send: #'==' env: nil to: [e var: 'X'] with: {[e nilLiteral]}])
		equals: 'X == nil'.
	self assert: (self ___textOf___: [:e |
			e statement: [
				e send: #'___compileMethod:category:' env: nil
					to: [e send: #class env: 0 to: [e var: 'X']]
					with: {[e string: 'm']. [e string: 'Grail-Slots']}]])
		equals: 'X @env0:class ___compileMethod: ''m'' category: ''Grail-Slots''.' , self ___lf___.
	self assert: (self ___textOf___: [:e |
			e send: #'___classHolderAttrStore___:put:' env: 1 to: [e var: 'X']
				with: {[e symbol: '__hash__']. [e var: 'None']}])
		equals: 'X @env1:___classHolderAttrStore___: #''__hash__'' put: None'.
	self should: [
		self ___textOf___: [:e | e send: #'a:b:' env: nil to: [e var: 'X'] with: {[e integer: 1]}]]
		raise: Error

]

{ #category : 'Grail-Tests' }
ClassBuildTextEmitterTestCase >> testStringLiteralIsNotIndented [
	"A method source carries its own newlines, and a class built inside an
	indented statement must not have the stream's indentation spliced into
	them: the literal is written in ONE piece."

	| s lf |
	lf := self ___lf___.
	s := PrettyWriteStream on: Unicode7 new.
	s increaseIndent.
	s lf.
	(ClassBuildTextEmitter on: s) statement: [
		(ClassBuildTextEmitter on: s) string: 'a' , lf , 'b'].
	self assert: s contents equals: lf , (String with: Character tab) , '''a' , lf , 'b''.' , lf

]
