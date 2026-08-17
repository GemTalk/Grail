! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for TypeThreeArgNamespaceTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'TypeThreeArgNamespaceTestCase'
  instVarNames: #( probe )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
TypeThreeArgNamespaceTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! TypeThreeArgNamespaceTestCase
!
! ``type(name, bases, namespace)'' with a NON-EMPTY namespace.
!
! Grail supported an EMPTY namespace only.  A non-empty one raised
! ``AttributeError: 'B' object has no attribute 'z''' from INSIDE the
! constructor -- so the error escaped the ``type()'' call rather than the later
! read, and a Python ``try''/``except'' around the attribute could not catch it,
! which is what made it look like a load bug rather than a construction one.
!
! FOUR causes, each hidden behind the previous, and each worth recording because
! the failure changed its shape at every step:
!
!   1. A class attribute is stored in a per-class ``___dynInstVars___'' holder, and a
!      class built by ``type()'' had no accessor pair for it -- ClassDefAst
!      emits one for every class it compiles.  ___ensureClassAttrHolder___.
!   2. That accessor is compiled by an env-1 method on Behavior, so the env-0
!      send used at first was a doesNotUnderstand -- swallowed by the guard
!      around the compile, which left the class holderless and the original
!      raise in place.  It looked exactly like the fix not working.
!   3. The accessor needs a class-side SLOT of that name, fixed at class
!      creation.  Compiling one without it FAILS, and a failed compile installs
!      the codegen-gap stub, so the store then died with ``NameError: Grail
!      could not compile this method'' instead.
!   4. Asking for that slot then hit a LATENT BUG in
!      Class >> ___subclass___:instVarNames:classInstVarNames:, whose duplicate
!      filter compares caller STRINGS against ``allInstVarNames'' SYMBOLS and so
!      never matched.  No caller had previously passed a name the parent already
!      owned; the first that did got rtErrAddDupInstvar, reported as the very
!      misleading ``Grail cannot subclass sealed kernel class 'Base'''.
!
! And one behavioural fix on top: ___inheritClassAttrs___ copies the PARENT's
! value into the subclass's matching slot, and an accessor slot outranks the
! holder a namespace store writes to -- so ``type('Derived', (Base,), {'kind':
! 'derived'})'' answered Base's value, the inherit pass overwriting the override
! it was meant to leave alone.  Its ``exclude:'' parameter existed for exactly
! this and had only ever been handed an empty set, because the non-empty case
! could not get that far.
!
! Beyond dynamic class creation this is a prerequisite for the __classcell__
! work: CPython's own test_super rebuilds a class from a namespace captured in a
! metaclass (``type("B", (), test_namespace)'').
!
! Every expectation is CPython 3.14.6's own output for
! tests/python/type_three_arg_namespace.py.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
TypeThreeArgNamespaceTestCase removeAllMethods.
TypeThreeArgNamespaceTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: TypeThreeArgNamespaceTestCase
setUp
	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: #'type_three_arg_namespace' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir
			, '/tests/python/type_three_arg_namespace.py')
		name: 'type_three_arg_namespace'.
	probe := (testModule @env1:___pyAttrLoad___: #'report')
		@env1:___pyCallValue___: #() kw: nil.
%

category: 'Grail-Private'
method: TypeThreeArgNamespaceTestCase
at: aKey
	^ probe @env1:__getitem__: aKey
%

! --- the headline: a non-empty namespace at all ---

category: 'Grail-Tests - Data Attributes'
method: TypeThreeArgNamespaceTestCase
testADataAttributeIsReadableOffTheClass
	"``type('Data', (), {'z': 5})'' then ``Data.z''.  This is the call that
	died inside the constructor."

	self assert: (self at: 'data_on_class') equals: 5.
%

category: 'Grail-Tests - Data Attributes'
method: TypeThreeArgNamespaceTestCase
testADataAttributeIsReadableOffAnInstance
	"The other half of a class attribute: an instance sees it too."

	self assert: (self at: 'data_on_instance') equals: 5.
	self assert: (self at: 'data_name') @env0:asString equals: 'Data'.
%

category: 'Grail-Tests - Data Attributes'
method: TypeThreeArgNamespaceTestCase
testAttributesCanStillBeAddedAfterwards
	"setattr on a dynamically built class lands in the same holder, so the
	holder the fix installs has to serve later stores as well as the ones
	the namespace made."

	self assert: (self at: 'setattr_after') @env0:asString equals: 'added'.
%

! --- functions in the namespace ---

category: 'Grail-Tests - Methods'
method: TypeThreeArgNamespaceTestCase
testAFunctionInTheNamespaceBecomesACallableMethod
	"``{'method': method}'' -- and it must bind the instance, since the
	function reads ``self.kind''."

	self assert: (self at: 'method_result') @env0:asString equals: 'method:plain'.
%

! --- bases, and the override that the inherit pass used to eat ---

category: 'Grail-Tests - Bases'
method: TypeThreeArgNamespaceTestCase
testAnInheritedMethodStillWorks
	self assert: (self at: 'derived_inherited') @env0:asString equals: 'inherited'.
%

category: 'Grail-Tests - Bases'
method: TypeThreeArgNamespaceTestCase
testTheNamespaceOverridesAnInheritedAttribute
	"___inheritClassAttrs___ copies the parent's value into the subclass's
	slot, and that slot outranks the holder the namespace wrote to -- so this
	answered 'base'.  The namespace's own names are excluded from that pass."

	self assert: (self at: 'derived_override') @env0:asString equals: 'derived'.
	self assert: (self at: 'base_untouched') @env0:asString equals: 'base'.
%

! --- guard: the case that already worked ---

category: 'Grail-Tests - Guards'
method: TypeThreeArgNamespaceTestCase
testAnEmptyNamespaceIsUnchanged
	"The path werkzeug's ``type('WrapperTestResponse', (TestResponse,
	wrapper), {})'' takes.  It worked before and must be untouched --
	including the inherited class attribute the exclude set now filters,
	which for an empty namespace is still nothing."

	self assert: (self at: 'empty_inherited') @env0:asString equals: 'inherited'.
	self assert: (self at: 'empty_kind') @env0:asString equals: 'base'.
%
