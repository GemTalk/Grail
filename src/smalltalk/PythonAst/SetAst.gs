! ------------------- Superclass check
run
ExpressionAst ifNil: [self error: 'ExpressionAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for SetAst
expectvalue /Class
doit
ExpressionAst subclass: 'SetAst'
  instVarNames: #( elts)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
SetAst comment:
'https://docs.python.org/3/library/ast.html#ast.Set

A set.

elts holds a list of nodes representing the set''s elements.

Example:
>>> print(ast.dump(ast.parse(''{1, 2, 3}'', mode=''eval''), indent=4))
Expression(
    body=Set(
        elts=[Constant(value=1), Constant(value=2), Constant(value=3)]))

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionAst
        SetAst(elts)
'
%

expectvalue /Class
doit
SetAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from SetAst
removeallmethods SetAst
removeallclassmethods SetAst

set compile_env: 0

category: 'Grail-traceback'
method: SetAst
printSmalltalkOn: aStream
	"Recorded, then emitted -- see AbstractNode >> ___recordingPrintSmalltalkOn___:."

	^ self ___recordingPrintSmalltalkOn___: aStream
%

category: 'Grail-other'
method: SetAst
___emitSmalltalkOn___: aStream

	aStream nextPutAll: '([:___s | '.
	elts do: [:each |
		"``{*a, 1}'': a STARRED element adds every item of the iterable, which
		is what set>>update: does -- ``adding elements from any iterable'',
		and the direct analogue of DictAst's ``___d ___pyUpdate___:'' for ``**''.
		Both spellings keep Grail's plumbing out of env 1 under a Python-shaped
		selector: ___pyUpdate___: is internal and @env0:add: is the facade store
		set>>add: itself forwards to (issue #1155).
		The element used to be printed as itself, and StarredAst's own emit
		is a ``*-unpack in call sites is not yet supported'' TypeError
		signal, so the display raised at RUN time -- which is why the upstream
		test for it is skipped with a Grail note rather than failing.
		In position, because a later element may overwrite nothing but the
		ORDER of iteration is still observable through a user __hash__."
		(each isKindOf: StarredAst)
			ifTrue: [
				aStream nextPutAll: '___s ___pyUpdate___: '.
				each value printSmalltalkWithParenthesisOn: aStream]
			ifFalse: [
				aStream nextPutAll: '___s @env0:add: '.
				"Parenthesize: an element that prints as a keyword send
				(``x @env1:___pyAttrLoad___: #'attr''') would otherwise fuse
				with ``add:'' into one selector (#add:___pyAttrLoad___:) —
				{inspect.Parameter.POSITIONAL_ONLY, ...} in django.utils.
				inspect hit exactly that."
				each printSmalltalkWithParenthesisOn: aStream].
		aStream nextPutAll: '. '.
	].
	aStream nextPutAll: '___s] @env0:value: (___set___ perform: #new env: 0))'.
%
method: SetAst
elts
	^elts
%
method: SetAst
elts: newValue
	elts := newValue
%

category: 'Grail-annotations'
method: SetAst
___defaultSourceString___
	"A set default fell to the ``<annotation>'' placeholder."

	| parts |
	parts := elts collect: [:e | e ___defaultSourceString___].
	parts isEmpty ifTrue: [^ 'set()'].
	^ '{' , (parts inject: '' into: [:acc :each |
		acc isEmpty ifTrue: [each] ifFalse: [acc , ', ' , each]]) , '}'
%

category: 'Grail-IR Codegen'
method: SetAst
___irEligibleValueLocals___: localNames
	"A set display whose every element is emittable.  A STARRED element is
	judged by its VALUE -- the thing that gets iterated -- because that is
	all the emit needs; the star itself carries nothing."

	^ elts allSatisfy: [:e |
		(e isKindOf: StarredAst)
			ifTrue: [e value ___irEligibleValueLocals___: localNames]
			ifFalse: [e ___irEligibleValueLocals___: localNames]]
%

category: 'Grail-IR Codegen'
method: SetAst
___emitIRValueOn___: aBuilder
	"``{a, *b}'' -> ``([:___s | ___s @env0:add: (a). ___s ___pyUpdate___: (b). ___s]
	@env0:value: (set perform: #new env: 0))'' -- printSmalltalkOn:'s shape."

	| accBlk fresh |
	aBuilder atNode: self.
	fresh := aBuilder
		send: #new to: (aBuilder globalNamed: #set) with: { } env: 0.
	accBlk := aBuilder blockWithArg: #'___s' do: [:sLeaf |
		elts do: [:each |
			"___emitSmalltalkOn___:'s two element shapes: ``___s @env0:add: (e)''
			and, for a star, ``___s ___pyUpdate___: (e)'' -- every item of the
			iterable, in position."
			(each isKindOf: StarredAst)
				ifTrue: [aBuilder add: (aBuilder
					send: #'___pyUpdate___:'
					to: (aBuilder var: sLeaf)
					with: { each value ___emitIRValueOn___: aBuilder })]
				ifFalse: [aBuilder add: (aBuilder
					send: #add:
					to: (aBuilder var: sLeaf)
					with: { each ___emitIRValueOn___: aBuilder }
					env: 0)]].
		aBuilder add: (aBuilder var: sLeaf)].
	^ aBuilder send: #value: to: accBlk with: { fresh } env: 0
%

category: 'Grail-IR Codegen'
method: SetAst
___irReadLocalNamesInto___: aSet locals: localSet
	elts do: [:e | e ___irReadLocalNamesInto___: aSet locals: localSet].
	^ self
%
