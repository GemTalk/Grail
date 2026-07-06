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

category: 'Grail-code generation'
classmethod: ComprehensionAst
___collectTargetNames___: aTarget into: seenSet on: aStream
	"Emit each leaf NameAst id of a (possibly nested) tuple target as
	a block temp, once."

	(aTarget isKindOf: NameAst) ifTrue: [
		(seenSet includes: aTarget id asSymbol) ifFalse: [
			seenSet add: aTarget id asSymbol.
			aStream nextPutAll: ' '; nextPutAll: aTarget id].
		^ self].
	(aTarget isKindOf: StarredAst) ifTrue: [
		^ self ___collectTargetNames___: aTarget value into: seenSet on: aStream].
	((aTarget isKindOf: TupleAst) or: [aTarget isKindOf: ListAst]) ifTrue: [
		aTarget elts do: [:e |
			self ___collectTargetNames___: e into: seenSet on: aStream]].
%

category: 'Grail-code generation'
classmethod: ComprehensionAst
___emitUnpack___: aTarget from: sourceExpr on: aStream
	"Bind aTarget from the Smalltalk expression sourceExpr — plain
	name, nested tuple (recursing with a wrapped __getitem__: source),
	or PEP 3132 star slice."

	| n |
	(aTarget isKindOf: NameAst) ifTrue: [
		aStream nextPutAll: aTarget id; nextPutAll: ' := '; nextPutAll: sourceExpr; nextPut: $.; lf.
		^ self].
	((aTarget isKindOf: TupleAst) or: [aTarget isKindOf: ListAst]) ifFalse: [^ self].
	n := aTarget elts size.
	aTarget elts doWithIndex: [:elt :i |
		| childExpr starIdx after |
		(elt isKindOf: StarredAst) ifTrue: [
			starIdx := i - 1.
			childExpr := '(list @env1:__new__: ((' , sourceExpr ,
				') __getitem__: (slice @env1:__new__: ' , starIdx printString ,
				' _: (((' , sourceExpr , ') __len__) @env0:- ' ,
				(n - i) printString , '))))'.
			self ___emitUnpack___: elt value from: childExpr on: aStream
		] ifFalse: [
			after := (aTarget elts copyFrom: 1 to: i - 1)
				anySatisfy: [:e | e isKindOf: StarredAst].
			childExpr := after
				ifTrue: ['((' , sourceExpr , ') __getitem__: (((' ,
					sourceExpr , ') __len__) @env0:- ' ,
					(n - i + 1) printString , '))']
				ifFalse: ['((' , sourceExpr , ') __getitem__: ' ,
					(i - 1) printString , ')'].
			self ___emitUnpack___: elt from: childExpr on: aStream
		]
	].
%

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
		| seen |
		"Recursive name collection: nested tuple targets (``for (a, b),
		c in ...'') and star targets contribute their leaf names.
		Dedupe: multiple ``_'' wildcards all parse to ___unused___;
		declaring the temp twice is a CompileError (assigning twice is
		fine)."
		seen := IdentitySet new.
		self ___collectTargetNames___: gen target into: seen on: aStream
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
		self ___emitUnpack___: gen target from: itemTemp on: aStream
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
