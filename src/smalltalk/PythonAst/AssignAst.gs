! ------------------- Superclass check
run
StatementAst ifNil: [self error: 'StatementAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for AssignAst
expectvalue /Class
doit
StatementAst subclass: 'AssignAst'
  instVarNames: #( targets value type_comment)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
AssignAst comment:
'https://docs.python.org/3/library/ast.html#ast.Assign

An assignment.

targets is a list of nodes (Name, Tuple, List, Attribute, or Subscript).
value is a single node.

Example:
>>> print(ast.dump(ast.parse(''x = y = z = 1''), indent=4))
Module(
    body=[
        Assign(
            targets=[Name(id=''x'', ctx=Store()), Name(id=''y'', ctx=Store()), Name(id=''z'', ctx=Store())],
            value=Constant(value=1))])

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      StatementAst
        AssignAst(targets value type_comment)'
%

expectvalue /Class
doit
AssignAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from AssignAst
removeallmethods AssignAst
removeallclassmethods AssignAst

set compile_env: 0

category: 'Grail-other'
method: AssignAst
addVariableNamesTo: aStream

	targets do: [:each | 
		each addVariableNamesTo: aStream.
	].
%

category: 'Grail-other'
method: AssignAst
printSmalltalkOn: aStream
	"Emit a Python assignment.  Python supports chained assignment
	``a = b = c = expr`` where every target receives the same value,
	evaluated once.  Smalltalk's `a := b := expr` IS chained at the
	syntactic level too, but only NameAst targets fit that form —
	AttributeAst/SubscriptAst/TupleAst targets each need their own
	statement.  Handle the chain by binding `value` to a temp once,
	then assigning each target from that temp."

	| tgt |
	targets size = 1 ifTrue: [
		tgt := targets first.
		(tgt isKindOf: AttributeAst) ifTrue: [
			^self printSmalltalkAttributeStoreOn: aStream target: tgt.
		].
		(tgt isKindOf: SubscriptAst) ifTrue: [
			^self printSmalltalkSubscriptStoreOn: aStream target: tgt.
		].
		(tgt isKindOf: TupleAst) ifTrue: [
			^self printSmalltalkTupleStoreOn: aStream target: tgt.
		].
		(tgt isKindOf: ListAst) ifTrue: [
			^self printSmalltalkTupleStoreOn: aStream target: tgt.
		].
		tgt printSmalltalkOn: aStream.
		aStream nextPutAll: ' := '.
		value printSmalltalkOn: aStream.
		aStream nextPut: $..
		^self
	].
	"Chained assignment: `a = b = c = value` — bind once, assign to each."
	aStream nextPutAll: '[| ___chain___ | ___chain___ := '.
	value printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: '. '.
	targets do: [:eachTgt |
		(eachTgt isKindOf: AttributeAst) ifTrue: [
			((eachTgt value isKindOf: NameAst)
				and: [CallAst isSelfReference: eachTgt value id])
				ifTrue: [
					aStream nextPutAll: eachTgt attr; nextPutAll: ' := ___chain___. '
				]
				ifFalse: [
					eachTgt value printSmalltalkWithParenthesisOn: aStream.
					aStream nextPutAll: ' @env1:'; nextPutAll: eachTgt attr;
						nextPutAll: ': ___chain___. '
				]
		] ifFalse: [
			(eachTgt isKindOf: SubscriptAst) ifTrue: [
				eachTgt value printSmalltalkWithParenthesisOn: aStream.
				aStream nextPutAll: ' __setitem__: '.
				eachTgt slice printSmalltalkWithParenthesisOn: aStream.
				aStream nextPutAll: ' _: ___chain___. '
			] ifFalse: [
				"Plain NameAst (or TupleAst/ListAst — rare chained with tuples)."
				eachTgt printSmalltalkOn: aStream.
				aStream nextPutAll: ' := ___chain___. '
			]
		]
	].
	aStream nextPutAll: '] value.'.
%

category: 'other'
method: AssignAst
printSmalltalkTupleStoreOn: aStream target: tgt
	"Tuple/list unpacking assignment: `a, b, c = expr`.  Bind `expr`
	to a temp, then unpack into each name via __getitem__.  Also
	handles a single starred target (`a, *b, c = expr`): items before
	the star bind to positive indices counting from 0, the starred
	target binds to a slice covering the middle, and items after the
	star bind to negative indices counting from the end."

	| holder elts starIdx |
	holder := '___unpack___'.
	elts := tgt elts.
	starIdx := elts findFirst: [:e | e isKindOf: StarredAst].
	aStream nextPutAll: '[| '; nextPutAll: holder; nextPutAll: ' | '; nextPutAll: holder; nextPutAll: ' := '.
	value printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: '. '.
	starIdx = 0 ifTrue: [
		elts doWithIndex: [:elt :i |
			elt printSmalltalkOn: aStream.
			aStream nextPutAll: ' := '; nextPutAll: holder; nextPutAll: ' __getitem__: '; print: i - 1; nextPutAll: '. '.
		].
	] ifFalse: [
		elts doWithIndex: [:elt :i |
			i < starIdx ifTrue: [
				"Before the star — positive index from start."
				elt printSmalltalkOn: aStream.
				aStream nextPutAll: ' := '; nextPutAll: holder; nextPutAll: ' __getitem__: '; print: i - 1; nextPutAll: '. '.
			] ifFalse: [(i = starIdx)
				ifTrue: [
					"Star itself: slice from current index to (size-after-star) before end."
					| afterCount |
					afterCount := elts size - i.
					elt value printSmalltalkOn: aStream.
					aStream nextPutAll: ' := '; nextPutAll: holder; nextPutAll: ' __getslice__: '; print: i - 1; nextPutAll: ' _: '.
					afterCount = 0
						ifTrue: [aStream nextPutAll: 'nil']
						ifFalse: [aStream nextPutAll: '-'; print: afterCount].
					aStream nextPutAll: ' _: nil. '.
				] ifFalse: [
					"After the star — negative index from end.  i is
					1-based and the last element is offset 1 from end, so
					the offset is `elts size - i + 1`."
					| offsetFromEnd |
					offsetFromEnd := elts size - i + 1.
					elt printSmalltalkOn: aStream.
					aStream nextPutAll: ' := '; nextPutAll: holder; nextPutAll: ' __getitem__: -'; print: offsetFromEnd; nextPutAll: '. '.
				]
			].
		].
	].
	aStream nextPutAll: '] value.'
%

category: 'Grail-other'
method: AssignAst
printSmalltalkAttributeStoreOn: aStream target: tgt
	"Generate attribute store.

	When in class method context and target is self.x,
	emit direct instVar assignment: `x := expr.`
	Otherwise: emit a setter send `obj @env1:attr: expr.` — generated
	classes have explicit setters compiled by compileClassDef.  This
	also works for module instVars (modules also receive setters
	via the per-name accessor generation in loadModuleFromPath)."

	((tgt value isKindOf: NameAst) and: [CallAst isSelfReference: tgt value id]) ifTrue: [
		aStream nextPutAll: tgt attr.
		aStream nextPutAll: ' := '.
		value printSmalltalkWithParenthesisOn: aStream.
		aStream nextPut: $..
		^self
	].
	tgt value printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ' @env1:'.
	aStream nextPutAll: tgt attr.
	aStream nextPutAll: ': '.
	value printSmalltalkWithParenthesisOn: aStream.
	aStream nextPut: $..
%

category: 'Grail-other'
method: AssignAst
printSmalltalkSubscriptStoreOn: aStream target: tgt
	"Generate: obj __setitem__: slice _: value."

	tgt value printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ' __setitem__: '.
	tgt slice printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ' _: '.
	value printSmalltalkWithParenthesisOn: aStream.
	aStream nextPut: $..
%

category: 'Grail-other'
method: AssignAst
target

	^targets at: 1
%

category: 'Grail-accessing'
method: AssignAst
targets

	^targets
%

category: 'Grail-accessing'
method: AssignAst
value

	^value
%
