! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ClassDictProxyTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ClassDictProxyTestCase'
  instVarNames: #( probe )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ClassDictProxyTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ClassDictProxyTestCase
!
! ``C.__dict__'' is a read-only mappingproxy for EVERY class.
!
! CPython's class namespace is a VIEW you can read, not a dict you can edit.
! Grail handed back the ___classDict___ snapshot itself, so both halves of that
! were wrong: ``type(C.__dict__)'' answered ``dict'', and ``C.__dict__['y'] = 2''
! silently mutated a throwaway mapping rather than raising TypeError -- which is
! the worse of the two, because it looks like it worked.
!
! ``type.__dict__'' was already a proxy, special-cased because CPython's own
! test_dict reaches through it to get hold of the mappingproxy TYPE
! (test_views_mapping).  That special case survives and is now the NARROW case
! rather than the only one: it answers a proxy over an empty dict, because only
! the proxy's type is ever consulted there.
!
! THE INSTANCE SIDE WAS WRONG IN THE OPPOSITE DIRECTION.  ``obj.__dict__'' IS a
! dict in CPython, and Grail leaked the name of the view class backing it --
! ``PyInstanceDict''.  Grail backs instance and module dicts with view classes so
! that a write reaches the object's real slots; ___isInstanceSingle___ already
! counted both as dict, and the NAME now agrees.
!
! THE RISK THIS CARRIED, and why it is called out here.  A class __dict__ read
! sits on a hot path, and the wrapper is a per-read allocation.  An earlier
! attempt at generalising this branch regressed test_richcmp's test_recursion --
! not by being wrong, but by adding stack frames that shifted where the
! recursion guard fires, so a comparison the test expects to complete raised
! RecursionError instead.  That module was measured first this time and holds;
! the full corpus shows no change.
!
! Every expectation is CPython 3.14.6's own output for
! tests/python/class_dict_proxy.py.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ClassDictProxyTestCase removeAllMethods.
ClassDictProxyTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ClassDictProxyTestCase
setUp
	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: #'class_dict_proxy' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/class_dict_proxy.py')
		name: 'class_dict_proxy'.
	probe := testModule @env1:___pyAttrLoad___: #'r'.
%

category: 'Grail-Private'
method: ClassDictProxyTestCase
at: aKey
	^ probe @env1:__getitem__: aKey
%

category: 'Grail-Tests - The proxy'
method: ClassDictProxyTestCase
testEveryClassDictIsAMappingproxy
	"Not just ``type''.  ``type(C.__dict__)'' answered ``dict'' for every class
	but that one, because the branch handed back the ___classDict___ snapshot."

	self assert: (self at: 'class_dict_type') @env0:asString
		equals: 'mappingproxy'.
	self assert: (self at: 'subclass_dict_type') @env0:asString
		equals: 'mappingproxy'.
%

category: 'Grail-Tests - The proxy'
method: ClassDictProxyTestCase
testTypeKeepsItsOwnProxy
	"The special case that came first still holds.  CPython's test_dict
	test_views_mapping reaches through ``type.__dict__'' to get the
	mappingproxy TYPE, so this one must not regress while the general case
	lands."

	self assert: (self at: 'type_dict_type') @env0:asString
		equals: 'mappingproxy'.
%

category: 'Grail-Tests - The proxy'
method: ClassDictProxyTestCase
testTheProxyIsReadOnly
	"``C.__dict__['y'] = 2'' is a TypeError.  It used to SUCCEED against a
	throwaway snapshot -- the worse failure, because the store appeared to work
	and then vanished."

	self assert: (self at: 'store_rejected') @env0:asString equals: 'TypeError'.
%

category: 'Grail-Tests - Reading through'
method: ClassDictProxyTestCase
testTheProxyStillReadsTheClassBody
	"Read-only must not mean opaque: membership and subscript still see the
	class body, attributes and methods alike."

	self assert: (self at: 'has_attr') equals: true.
	self assert: (self at: 'has_method') equals: true.
	self assert: (self at: 'read_through') @env0:asString equals: '1'.
%

category: 'Grail-Tests - Reading through'
method: ClassDictProxyTestCase
testASubclassProxyShowsOnlyItsOwnNamespace
	"``__dict__'' is the class's OWN namespace, never a flattening of the MRO
	-- inherited names are reached through the chain, not through here.  This
	is what tells a real proxy from a convenience merge."

	self assert: ((self at: 'subclass_own') asArray
			collect: [:e | e @env0:asString])
		equals: #( 'true' 'false' ).
%

category: 'Grail-Tests - The instance side'
method: ClassDictProxyTestCase
testAnInstanceDictIsAPlainDict
	"The mirror image, and wrong in the opposite direction: an instance
	__dict__ IS a dict in CPython, and Grail reported ``PyInstanceDict'' -- the
	view class that makes a write reach the object's real slots.  It stays a
	view; only the NAME changes, matching what isinstance already said."

	self assert: (self at: 'instance_dict_type') @env0:asString equals: 'dict'.
	self assert: (self at: 'instance_read') @env0:asString equals: 'i'.
%
