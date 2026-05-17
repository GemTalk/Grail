! ------------------- Superclass check
run
AbstractNode ifNil: [self error: 'AbstractNode is not defined. Check file ordering.'].
%

! ------------------- Class definition for ComprehensionAst
expectvalue /Class
doit
AbstractNode subclass: 'ComprehensionAst'
  instVarNames: #( target iter ifs
                    is_async)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
ComprehensionAst comment:
'https://docs.python.org/3/library/ast.html#ast.comprehension

A single for clause in a comprehension.

target is the variable(s) the comprehension iterates over.
iter is the iterable.
ifs is a list of test expressions.
is_async is 1 if it is an async comprehension, 0 otherwise.

Example:
>>> print(ast.dump(ast.parse(''[x for x in numbers if x > 0]'', mode=''eval''), indent=4))
Expression(
    body=ListComp(
        elt=Name(id=''x'', ctx=Load()),
        generators=[
            comprehension(
                target=Name(id=''x'', ctx=Store()),
                iter=Name(id=''numbers'', ctx=Load()),
                ifs=[Compare(...)])]))

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ComprehensionAst(target iter ifs is_async)
'
%

expectvalue /Class
doit
ComprehensionAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from ComprehensionAst
removeallmethods ComprehensionAst
removeallclassmethods ComprehensionAst
set compile_env: 0
! ------------------- Class methods for ComprehensionAst
! ------------------- Instance methods for ComprehensionAst

category: 'accessing'
method: ComprehensionAst
target
	^target
%

category: 'accessing'
method: ComprehensionAst
iter
	^iter
%

category: 'accessing'
method: ComprehensionAst
ifs
	^ifs
%

! ------------------- Code generation shared by ListComp / DictComp / SetComp / GeneratorExp

category: 'code generation'
classmethod: ComprehensionAst
emitGenerators: aCollection from: anIndex on: aStream innerBody: aBlock
	"Recursively emit each generator clause from aCollection starting at
	anIndex; aBlock prints the deepest body once all generators are
	consumed.  Each generator emits a fresh `___iterN___` temp, a
	[true] whileTrue: loop, target binding (with tuple unpacking when
	needed), and chained `ifTrue:` blocks for the if-clauses."

	| gen iterTemp itemTemp isTupleTarget hasIfs |
	anIndex > aCollection size ifTrue: [
		aBlock value.
		^self
	].
	gen := aCollection at: anIndex.
	iterTemp := '___iter' , anIndex printString , '___'.
	itemTemp := '___item' , anIndex printString , '___'.
	isTupleTarget := gen target isKindOf: TupleAst.
	hasIfs := gen ifs notNil and: [gen ifs size > 0].

	"Open block + StopIteration handler"
	aStream nextPutAll: '[| ', iterTemp.
	isTupleTarget ifTrue: [aStream nextPutAll: ' ', itemTemp].
	isTupleTarget ifTrue: [
		gen target elts do: [:each |
			aStream nextPutAll: ' '; nextPutAll: each id
		]
	] ifFalse: [
		aStream nextPutAll: ' '; nextPutAll: gen target id
	].
	aStream nextPutAll: ' |'; lf; increaseIndent.

	"___iterN___ := iter __iter__."
	aStream nextPutAll: iterTemp; nextPutAll: ' := '.
	gen iter printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ' __iter__.'; lf.

	"[true] whileTrue: ["
	aStream nextPutAll: '[true] whileTrue: ['; lf; increaseIndent.

	"Bind target (tuple unpack or simple)"
	isTupleTarget ifTrue: [
		aStream nextPutAll: itemTemp; nextPutAll: ' := '; nextPutAll: iterTemp; nextPutAll: ' __next__.'; lf.
		gen target elts doWithIndex: [:each :i |
			aStream nextPutAll: each id; nextPutAll: ' := '; nextPutAll: itemTemp.
			aStream nextPutAll: ' __getitem__: '; print: i - 1; nextPut: $.; lf
		]
	] ifFalse: [
		gen target printSmalltalkOn: aStream.
		aStream nextPutAll: ' := '; nextPutAll: iterTemp; nextPutAll: ' __next__.'; lf
	].

	"Chain the if-clauses around the inner body"
	hasIfs ifTrue: [
		gen ifs do: [:cond |
			cond printSmalltalkWithParenthesisOn: aStream.
			aStream nextPutAll: ' ___isTruthy___ ifTrue: ['; lf; increaseIndent
		].
		self emitGenerators: aCollection from: anIndex + 1 on: aStream innerBody: aBlock.
		gen ifs do: [:_unused |
			aStream decreaseIndent; nextPutAll: '].'; lf
		]
	] ifFalse: [
		self emitGenerators: aCollection from: anIndex + 1 on: aStream innerBody: aBlock
	].

	"Close whileTrue:, handler"
	aStream decreaseIndent; nextPutAll: '].'; lf.
	aStream decreaseIndent; nextPutAll: '] @env0:on: StopIteration do: [:___ex___ | nil].'; lf
%
