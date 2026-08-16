! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for MetaclassBaseTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'MetaclassBaseTestCase'
  instVarNames: #( probe )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
MetaclassBaseTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! MetaclassBaseTestCase
!
! ``class Meta(type)'' now has a real ``type'' in its ancestry.
!
! Grail had a ``type'' BUILTIN -- ``type(x)'' answers x's class -- but no
! ``type'' OBJECT: the name evaluated to a BoundMethod on builtins.  A class
! cannot inherit from a non-class, so ClassDefAst carried a hard-coded redirect
! rooting every ``class M(type)'' at PythonInstance, with a comment recording
! that nothing was bound to the name.  PyType is the missing object, and the
! redirect now points at it.
!
! WHY IT MATTERS MORE THAN THE SCORE SUGGESTS.  This is not primarily a
! test-count fix -- it moves nothing in the CPython suite by itself.  It is the
! base the vendored ports were REWRITTEN to avoid needing.  Each site says so
! in its own words ("Grail doesn't expose ``type'' as a base and drops
! metaclass= kwargs"): django's ModelBase, MediaDefiningClass, InstanceCheckMeta,
! ChoicesType and AutoFieldMeta are demoted to plain classes, jinja2's NodeType
! is not honoured, and django's own note records that defining concrete user
! models is therefore unsupported.
!
! WHAT IS DELIBERATELY NOT DONE YET, and why not in this step:
!
!   * ``type'' as a VALUE is still the BoundMethod, so ``issubclass(Meta,
!     type)'' and ``isinstance(type, type)'' are still False where CPython
!     answers True.  Binding the NAME to PyType was tried and REGRESSED two
!     modules: it makes NameAst >> isResolvableSymbol: true for ``type'', so
!     ``type('NewClass', (object,), {})'' compiles as a CONSTRUCTOR call and
!     dies with a Smalltalk MessageNotUnderstood (test_subclassinit test_type).
!     The name has to be bound in the same step that gives PyType the call
!     protocol, so it cannot race ahead of it.
!   * PyType carries no construction protocol (__call__ / __new__ / __init__ /
!     mro), and the class statement still does not route through a metaclass.
!
! WHY NOT A SMALLTALK METACLASS.  ``Foo class'' cannot model Python's: it is
! auto-created with Foo, has exactly one instance, and its superclass is FORCED
! to ``Foo superclass class'' -- so the metaclass hierarchy mirrors the class
! hierarchy rigidly, while Python lets the two differ (``class A(Base,
! metaclass=Meta)'') and shares one metaclass across many classes.  Neither is
! expressible with ``Foo class'', so a Python metaclass is an ORDINARY Grail
! class and the Smalltalk metaclass keeps its own job.
!
! PyType subclasses PythonInstance, not Object: the ``isKindOf: PythonInstance''
! gates in ___pyAttrLoad___ misfire for a class outside that chain, which is the
! same reason ``class C(object)'' is redirected there.
!
! Every expectation is CPython 3.14.6's own output for
! tests/python/metaclass_base.py.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
MetaclassBaseTestCase removeAllMethods.
MetaclassBaseTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: MetaclassBaseTestCase
setUp
	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: #'metaclass_base' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/metaclass_base.py')
		name: 'metaclass_base'.
	probe := (testModule @env1:___pyAttrLoad___: #'report')
		@env1:___pyCallValue___: #() kw: nil.
%

category: 'Grail-Private'
method: MetaclassBaseTestCase
at: aKey
	^ probe @env1:__getitem__: aKey
%

! --- the headline ---

category: 'Grail-Tests - The base'
method: MetaclassBaseTestCase
testAMetaclassIsRootedAtType
	"``Meta.__bases__'' answered ``['PythonInstance']'' -- the substitute the
	redirect used while there was no ``type'' object to name."

	self assert: ((self at: 'meta_bases') asArray
			collect: [:e | e @env0:asString])
		equals: #( 'type' ).
%

category: 'Grail-Tests - The base'
method: MetaclassBaseTestCase
testTypeReportsItsPythonName
	"The Smalltalk class is PyType -- ``type'' is too generic a name to claim
	as a Smalltalk global -- so the Python name comes from the name mapping in
	object >> ___pythonClassNameOrNil___, as it does for PyDict / PyCell."

	self assert: (self at: 'type_name') @env0:asString equals: 'type'.
%

! --- guards: a metaclass is still an ordinary class ---

category: 'Grail-Tests - Guards'
method: MetaclassBaseTestCase
testAMetaclassIsStillAnOrdinaryClass
	"Re-rooting must not cost what rooting at PythonInstance bought: the class
	exists, is named, is recognised as a class, and carries its methods --
	which is what a metaclass-defined comparison needs
	(functools.total_ordering's metaclass case)."

	self assert: (self at: 'meta_name') @env0:asString equals: 'Meta'.
	self assert: (self at: 'meta_is_class') equals: true.
	self assert: (self at: 'meta_method') @env0:asString equals: 'shout'.
%

category: 'Grail-Tests - Guards'
method: MetaclassBaseTestCase
testAnOrdinaryClassIsUndisturbed
	"``type(Plain)'' still answers the canonical ``type'', and a plain class is
	still an instance of it.  The 1-arg builtin is untouched by this step."

	self assert: (self at: 'plain_type') @env0:asString equals: 'type'.
	self assert: (self at: 'plain_is_class') equals: true.
%
