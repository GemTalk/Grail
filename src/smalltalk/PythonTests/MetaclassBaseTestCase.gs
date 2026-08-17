! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for MetaclassBaseTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'MetaclassBaseTestCase'
  instVarNames: #( probe typeProbe )
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
! ``type'' AS A VALUE IS NOW THE CLASS TOO.  The name is bound to PyType, and
! PyType is callable in both spellings, so issubclass(Meta, type),
! isinstance(type, type) and a class-shaped repr all hold.  Those two changes
! had to land TOGETHER: binding the name alone makes NameAst >>
! isResolvableSymbol: true for ``type'', so ``type('NewClass', (object,), {})''
! compiles as a CONSTRUCTOR call and dies with a Smalltalk
! MessageNotUnderstood (test_subclassinit test_type).
!
! Three consequences that measurement forced, each recorded where it lives:
!
!   * object >> ___pyMetaclass___ answers PyType as the canonical type, so
!     ``type(cls) is type'' still holds.  Moving only the name broke it.
!   * isinstance and issubclass no longer share one substitution.  ``type''
!     used to resolve to Behavior for both, conflating ``is x a class'' with
!     ``does c inherit from type''.  issubclass keeps a DISJUNCTION -- rooted
!     at PyType, or a Smalltalk-written metaclass that is a Behavior -- because
!     EnumType is the latter and dropping it cost ten test_enum tests (copy()
!     decides a class is atomic with issubclass(type(x), type)).
!   * the Behavior branch of ___pyAttrLoad___ lets PyType answer __dict__ for
!     itself, so ``type(type.__dict__)'' still yields the mappingproxy type.
!     Written first as a general ``does the metaclass define __dict__'' probe,
!     which regressed test_richcmp: that probe walks the metaclass chain on
!     EVERY class __dict__ read and shifted where the recursion guard fires.
!
! STILL NOT DONE: PyType carries no CONSTRUCTION protocol (__new__ / __init__ /
! mro), and the class statement does not route through a metaclass -- so
! type(C) still answers ``type'' rather than a declared ``metaclass=''.
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

category: 'Grail-Setup'
method: MetaclassBaseTestCase
setUpTypeObject
	"The step-2 half of the fixture: ``type'' as a first-class object."

	| testModule |
	testModule := importlib @env1:modules @env1:__getitem__: 'metaclass_base'.
	typeProbe := (testModule @env1:___pyAttrLoad___: #'report_type_object')
		@env1:___pyCallValue___: #() kw: nil.
%

category: 'Grail-Private'
method: MetaclassBaseTestCase
at: aKey
	^ probe @env1:__getitem__: aKey
%

category: 'Grail-Private'
method: MetaclassBaseTestCase
typeAt: aKey
	typeProbe isNil ifTrue: [self setUpTypeObject].
	^ typeProbe @env1:__getitem__: aKey
%

! --- step 2: ``type'' is a first-class object, and still callable ---

category: 'Grail-Tests - The type object'
method: MetaclassBaseTestCase
testAMetaclassIsASubclassOfType
	"False for as long as ``type'' was a BoundMethod: a class cannot subclass
	one, so nothing linked a metaclass back to ``type''.  This is the answer
	that unblocks reporting a declared ``metaclass='' from type(), which
	___pyMetaclass___ declines to do only because copy()'s atomic test
	``issubclass(type(x), type)'' had no real answer."

	self assert: (self typeAt: 'issubclass_meta') equals: true.
%

category: 'Grail-Tests - The type object'
method: MetaclassBaseTestCase
testTypeIsItselfAClass
	"``isinstance(type, type)'' and a class-shaped repr.  Both were false
	while the name answered a callable wrapper."

	self assert: (self typeAt: 'isinstance_type') equals: true.
	self assert: (self typeAt: 'repr_is_class') equals: true.
%

category: 'Grail-Tests - The type object'
method: MetaclassBaseTestCase
testTypeIsStillCallableInBothSpellings
	"Becoming a class must not cost the builtin.  Binding the name WITHOUT
	the call protocol broke exactly this -- ``type('NewClass', (object,), {})''
	died with a Smalltalk MessageNotUnderstood -- which is why PyType's
	value:value:/_new:kw: pair and the name landed together."

	self assert: (self typeAt: 'one_arg') @env0:asString equals: 'int'.
	self assert: (self typeAt: 'three_arg_name') @env0:asString equals: 'NewClass'.
	self assert: (self typeAt: 'three_arg_isclass') equals: true.
%

category: 'Grail-Tests - The type object'
method: MetaclassBaseTestCase
testTypeRejectsTheKeywordSpelling
	"CPython: ``type(name='C', bases=(), dict={})'' is a TypeError."

	self assert: (self typeAt: 'kwargs_rejected') @env0:asString equals: 'TypeError'.
%

category: 'Grail-Tests - The type object'
method: MetaclassBaseTestCase
testTypeOfAClassIsStillTypeItself
	"``type(cls) is type''.  The NAME and the CANONICAL ANSWER had to move to
	PyType together -- moving only the name broke this identity, which is what
	ClassMetaclassIdentityTestCase and OperatorSemantics caught."

	self assert: (self typeAt: 'identity_holds') equals: true.
%

category: 'Grail-Tests - The type object'
method: MetaclassBaseTestCase
testTypeDictIsAMappingproxy
	"``type(type.__dict__)'' is how CPython's own test_dict gets hold of the
	mappingproxy TYPE, to assert a dict view's ``.mapping'' is one.
	BoundMethod >> __dict__ carried this while ``type'' was a BoundMethod;
	once it became a class the read went to ___classDict___ (a snapshot dict)
	instead, and test_dict test_views_mapping failed.  The Behavior branch of
	___pyAttrLoad___ now lets PyType answer for itself."

	self assert: (self typeAt: 'dict_is_proxy') @env0:asString
		equals: 'mappingproxy'.
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
