! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ClassBodyBindingProtocolTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ClassBodyBindingProtocolTestCase'
  instVarNames: #( probe )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ClassBodyBindingProtocolTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ClassBodyBindingProtocolTestCase
!
! The class-body BINDING PROTOCOL: a statement announces itself.
!
! CPython executes a class body as a namespace, so every binding form there
! is simply run.  Grail compiles the body STRUCTURALLY, so ClassDefAst has to
! ask each statement two questions:
!
!   ___boundTargetNames___    which names does this bind?  (drives source-order
!                             resolution, so a later sibling sees the name
!                             class-locally instead of falling back to module
!                             scope)
!   classBodyAttributePairs   which class-attribute name -> valueAst pairs does
!                             it yield?
!
! Both are answered by the STATEMENT, with an empty default on StatementAst;
! the parent only assigns positions and applies cross-statement rules.  They
! used to be isKindOf: tests spread over three separate scans in ClassDefAst,
! which is how ``import'' in a class body came to be handled by two of the
! three (see ClassBodyImportTestCase) and missed by the __set_name__ ordering
! scan.  The structural tests below pin the invariant that makes that class of
! bug impossible: every statement kind answers both selectors, so no scan can
! silently skip a binding form.
!
! The two questions are deliberately separate.  ``def'' and a nested ``class''
! bind a NAME but yield no attribute VALUE -- conflating them would let a def
! steal the value position from a rebinding assignment such as
! ``helper = staticmethod(helper)''.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ClassBodyBindingProtocolTestCase removeAllMethods.
ClassBodyBindingProtocolTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ClassBodyBindingProtocolTestCase
setUp
	"Reload tests/python/class_body_bindings.py fresh each test; the classes
	are built once at import, so each assertion reads that construction."

	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: #'class_body_bindings' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/class_body_bindings.py')
		name: 'class_body_bindings'.
	probe := testModule @env1:probe.
%

category: 'Grail-Private'
method: ClassBodyBindingProtocolTestCase
at: aKey
	^ probe @env1:__getitem__: aKey
%

category: 'Grail-Private'
method: ClassBodyBindingProtocolTestCase
classBodyOf: aSource
	"Parse aSource -- a single class definition -- and answer the
	OrderedCollection of statements making up its body."

	| module |
	module := PythonParser parse: aSource.
	^ module body body first body body
%

category: 'Grail-Private'
method: ClassBodyBindingProtocolTestCase
boundNamesIn: aSource
	"Every name announced by the body of the class in aSource, in source
	order -- exactly what ClassDefAst's scans consume."

	| names |
	names := OrderedCollection new.
	(self classBodyOf: aSource) do: [:stmt |
		stmt ___boundTargetNames___ do: [:nm | names add: nm]].
	^ names asArray
%

category: 'Grail-Private'
method: ClassBodyBindingProtocolTestCase
attributeNamesIn: aSource
	"Every class-attribute name announced by the body of the class in
	aSource, in source order."

	| names |
	names := OrderedCollection new.
	(self classBodyOf: aSource) do: [:stmt |
		stmt classBodyAttributePairs do: [:pair | names add: pair key]].
	^ names asArray
%

! ------------------- Structural: the protocol itself

category: 'Grail-Tests - protocol'
method: ClassBodyBindingProtocolTestCase
testEveryStatementKindAnswersTheProtocol
	"The invariant that makes a missed binding form impossible: EVERY
	statement kind answers both selectors, so a class-body scan can send
	them unconditionally instead of testing isKindOf: against a list it
	might not be updated to include."

	| kinds missing |
	kinds := (OrderedCollection with: StatementAst)
		addAll: StatementAst allSubclasses;
		yourself.
	self assert: kinds size > 20.
	missing := kinds reject: [:cls |
		(cls canUnderstand: #'___boundTargetNames___')
			and: [cls canUnderstand: #'classBodyAttributePairs']].
	self assert: missing asArray equals: #()
%

category: 'Grail-Tests - protocol'
method: ClassBodyBindingProtocolTestCase
testStatementDefaultsAreEmpty
	"StatementAst supplies the empty default, so a statement that binds
	nothing needs no code at all."

	self assert: StatementAst new ___boundTargetNames___ isEmpty.
	self assert: StatementAst new classBodyAttributePairs isEmpty
%

category: 'Grail-Tests - protocol'
method: ClassBodyBindingProtocolTestCase
testNonBindingStatementsAnnounceNothing
	"Statements that bind no name in the class namespace stay silent --
	they inherit the default rather than being excluded by each scan."

	self
		assert: (self boundNamesIn: 'class C:
    pass
    assert True
    del undefined_name
    if x:
        pass
')
		equals: #()
%

category: 'Grail-Tests - protocol'
method: ClassBodyBindingProtocolTestCase
testBindingFormsAnnounceTheirNames
	"Each binding form announces every name it binds, in source order."

	self
		assert: (self boundNamesIn: 'class C:
    import json
    import os.path as p
    plain = 1
    annotated: int = 2
    x = y = 3
    t1, t2 = pair
    def meth(self):
        pass
    class Nested:
        pass
')
		equals: #( #json #p #plain #annotated #x #y #t1 #t2 #meth #Nested )
%

category: 'Grail-Tests - protocol'
method: ClassBodyBindingProtocolTestCase
testDefAndNestedClassBindANameButYieldNoAttributeValue
	"The reason the protocol is TWO questions rather than one.  A ``def''
	and a nested ``class'' bind a name -- so later siblings resolve it --
	but neither produces a class-attribute value: the def compiles to a real
	method and the nested class to a real Smalltalk class.  Were they to
	claim a value, ``helper = staticmethod(helper)'' would lose to the def
	that precedes it."

	| src |
	src := 'class C:
    def meth(self):
        pass
    class Nested:
        pass
'.
	self assert: (self boundNamesIn: src) equals: #( #meth #Nested ).
	self assert: (self attributeNamesIn: src) equals: #()
%

category: 'Grail-Tests - protocol'
method: ClassBodyBindingProtocolTestCase
testAttributeYieldingFormsAnnounceTheirPairs
	"Assignment, annotated assignment, tuple-target assignment and import
	all yield class-attribute pairs -- the import included, which is the
	form that had to be taught to each scan separately before."

	self
		assert: (self attributeNamesIn: 'class C:
    import json
    plain = 1
    annotated: int = 2
    x = y = 3
    t1, t2 = pair
')
		equals: #( #json #plain #annotated #x #y #t1 #t2 )
%

category: 'Grail-Tests - protocol'
method: ClassBodyBindingProtocolTestCase
testNonNameTargetsYieldNoAttribute
	"Attribute and subscript targets bind nothing ON THE CLASS, so they
	announce no pair -- and, because attribute positions are driven by the
	pairs, they cannot displace the statement the attribute really came
	from."

	self
		assert: (self attributeNamesIn: 'class C:
    holder = {}
    holder["k"] = 1
    holder.attr = 2
')
		equals: #( #holder )
%

! ------------------- Behavioural: the compiled result

category: 'Grail-Tests - behaviour'
method: ClassBodyBindingProtocolTestCase
testNestedClassVisibleToLaterSibling
	"A nested class binds its name, so a later body statement resolves it
	class-locally instead of falling back to module scope."

	self assert: (self at: 'nested_inner_tag') @env0:asString equals: 'inner'.
	self assert: (self at: 'nested_derived') @env0:asString equals: 'inner!'
%

category: 'Grail-Tests - behaviour'
method: ClassBodyBindingProtocolTestCase
testTupleTargetClassAttributes
	"``first, second = pair'' materialises one attribute per element."

	self assert: (self at: 'tuple_first') @env0:asString equals: 'a'.
	self assert: (self at: 'tuple_second') @env0:asString equals: 'b'
%

category: 'Grail-Tests - behaviour'
method: ClassBodyBindingProtocolTestCase
testChainedAssignmentSharesOneValue
	"``a = b = c = []'' binds three names to ONE list; the value AST is
	emitted once and the rest alias it, so mutating through one name is
	visible through the others."

	self assert: (self at: 'chained_shared')
%

category: 'Grail-Tests - behaviour'
method: ClassBodyBindingProtocolTestCase
testAnnotatedAssignmentValue
	"``declared: int = 7'' drops the annotation and keeps the value."

	self assert: (self at: 'annotated_declared') equals: 7
%
