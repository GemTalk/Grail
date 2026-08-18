! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for UnboundMethodDictTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'UnboundMethodDictTestCase'
  instVarNames: #( probe )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
UnboundMethodDictTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! UnboundMethodDictTestCase
!
! ``Cls.method.__dict__'' -- FUNCTION ATTRIBUTES ON A METHOD.
!
! In Python 3 a method read off its class IS a plain function, so it carries a
! writable __dict__, and decorators use it freely.  test_decorators has two such
! decorators and BOTH go through the dict rather than through setattr:
! funcattrs is ``func.__dict__.update(kwds)'' and MiscDecorators.author is
! ``func.__dict__['author'] = name''.
!
! Grail models ``Cls.method'' as an UnboundMethod handle.  SETTING an attribute
! on one ALREADY WORKED -- ``Cls.m.x = 1'' lands in the interned handle's
! dynamic-instVar storage and reads back fine -- so the gap was narrow and easy
! to mis-locate: there was no __dict__ to reach those attributes THROUGH.  Both
! spellings above raised AttributeError, while the setattr spelling beside them
! succeeded.
!
! THE SYMPTOM WAS A MISSING ATTRIBUTE, NOT THE AttributeError.  A class-body
! decorator is applied inside a handler that leaves the undecorated method in
! place if applying it raises (printMethodDecoratorsOn:, deliberately, so a
! decorator Grail cannot apply is no worse than before).  So funcattrs died on
! ``func.__dict__'', the decorator was discarded whole, and the first visible
! sign was ``C.foo.abc'' raising several statements later -- pointing at the
! READ rather than at the write that never happened.  Worth remembering when
! reading any class-body decorator failure: the reported error is downstream of
! the real one.
!
! LIVENESS IS THE PROPERTY, not mere presence.  ``update'' against a snapshot
! would absorb the merge and change nothing, so a __dict__ that answered a copy
! would make the decorator APPEAR to succeed while doing nothing -- strictly
! worse than the AttributeError, which at least announced itself.  PyInstanceDict
! writes through to dynamic-instVar storage; it is the same view PythonInstance
! answers, and ExecBlock's __dict__ carries the same requirement for the same
! reason (functools.update_wrapper merges into ``getattr(wrapper, '__dict__')'').
!
! INTERNING IS WHAT MAKES THE STORAGE WORTH EXPOSING.  ``Cls.m is Cls.m'' holds
! (UnboundMethod class >> definingClass:selector:), so an attribute written
! through the view is still there on the next read of that name.  CPython gets
! this for free by keeping ONE function object in the class dictionary; Grail
! mints a handle, so without interning a decorator's writes would land on an
! object nobody reads again.
!
! Fixture: tests/python/unbound_method_dict.py (self-verifying under CPython
! 3.14).
! ===============================================================================

set compile_env: 0

category: 'Grail-Setup'
method: UnboundMethodDictTestCase
setUp
	probe := self ___loadProbe___: 'unbound_method_dict'.
%

category: 'Grail-Private'
method: UnboundMethodDictTestCase
___loadProbe___: aName
	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: aName asSymbol ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/' , aName , '.py')
		name: aName.
	^ testModule @env1:___pyAttrLoad___: #'r'
%

category: 'Grail-Private'
method: UnboundMethodDictTestCase
reprAt: aKey
	"The fixture's entries are nested Python values; compare their repr so a
	failure prints both sides whole."

	^ (probe @env1:__getitem__: aKey) @env1:__repr__ @env0:asString
%

category: 'Grail-Tests'
method: UnboundMethodDictTestCase
testDictUpdateDecoratorReachesTheMethod
	"test_decorators' test_double, exactly: two stacked funcattrs, each
	merging through __dict__.update.  Previously the first one raised, both
	were discarded, and the attribute reads failed."

	self assert: (self reprAt: 'dict_update_decorator')
		equals: '[42, 1, ''haha'', 42]'.
%

category: 'Grail-Tests'
method: UnboundMethodDictTestCase
testDictItemAssignmentReachesTheMethod
	"MiscDecorators.author's spelling -- ``func.__dict__['author'] = name''.
	A separate path from update:, and the one a decorator writing a single
	attribute typically uses."

	self assert: (self reprAt: 'setitem_decorator') equals: '[''Cleese'', 1]'.
%

category: 'Grail-Tests'
method: UnboundMethodDictTestCase
testTheDictIsLiveNotASnapshot
	"THE test.  A __dict__ that answered a copy would let both decorators
	above appear to succeed and change nothing -- strictly worse than raising,
	because nothing would announce it."

	self assert: (self reprAt: 'dict_is_live_not_a_snapshot')
		equals: '[1, 2, [''a'', ''b'']]'.
%

category: 'Grail-Tests'
method: UnboundMethodDictTestCase
testAnUndecoratedMethodHasAnEmptyDict
	"Empty, not absent, and not populated with the metadata slots.  CPython
	implements __name__ / __qualname__ / __doc__ / __module__ as getset
	descriptors rather than dict entries, so a fresh function's __dict__ is
	``{}'' -- the same distinction ExecBlock's __dict__ maintains."

	self assert: (self reprAt: 'dict_starts_empty') equals: '[]'.
%

category: 'Grail-Tests'
method: UnboundMethodDictTestCase
testSetattrStillWorksAndAgreesWithTheDict
	"The path that worked BEFORE this change, kept so the new view does not
	displace it -- and pinning that the two spellings see one store rather
	than two."

	self assert: (self reprAt: 'setattr_still_works') equals: '[9, True]'.
%

category: 'Grail-Tests'
method: UnboundMethodDictTestCase
testAttributesDoNotLeakOntoTheClass
	"A function attribute belongs to the FUNCTION.  The handle is interned per
	(class, selector) and its storage is its own, so ``abc'' must not appear in
	C.__dict__ or dir(C) -- which a fix that stashed these on the class would
	have got wrong."

	self assert: (self reprAt: 'attributes_do_not_leak_onto_the_class')
		equals: '[False, False, 1]'.
%

category: 'Grail-Tests'
method: UnboundMethodDictTestCase
testTheHandleIsInterned
	"Why the storage is stable enough to expose: one handle per (class, name),
	so a write through __dict__ is visible to the next read.  Without this the
	view would be live onto an object nobody reads again."

	self assert: (self reprAt: 'the_handle_is_interned') equals: 'True'.
%

category: 'Grail-Tests'
method: UnboundMethodDictTestCase
testAttributesAreVisibleThroughAnInstanceRead
	"``C().foo.abc'' -- the bound read reaches the same attributes, since
	CPython's bound method forwards attribute lookup to its function."

	self assert: (self reprAt: 'visible_through_an_instance_read') equals: '1'.
%

category: 'Grail-Tests'
method: UnboundMethodDictTestCase
testTheDecoratorIsNotSilentlyDropped
	"Speaks to the failure MODE rather than the attribute: this decorator
	REPLACES the function, so a dropped decorator answers 1 where the applied
	one answers 99.  It is the check that distinguishes ``the decorator ran''
	from ``the attribute happens to be readable''."

	self assert: (self reprAt: 'decorator_is_not_silently_dropped')
		equals: '[99, ''seen'']'.
%

category: 'Grail-Tests'
method: UnboundMethodDictTestCase
testANestedFunctionIsUnaffected
	"The ExecBlock path, which already had a live __dict__ -- regression guard
	on the class of callable this change does NOT touch."

	self assert: (self reprAt: 'a_nested_function_is_unaffected')
		equals: '[42, 1, [''abc'']]'.
%
