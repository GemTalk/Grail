! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for AugAssignComplexTargetTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'AugAssignComplexTargetTestCase'
  instVarNames: #( irModule irRegistrySnapshot )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
AugAssignComplexTargetTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! AugAssignComplexTargetTestCase
!
! ``obj.x op= v'' AND ``obj[i] op= v'' ON THE IR PATH -- THE IN-PLACE AND
! REFLECTED DUNDERS THE BARE BINARY OPERATOR LOSES.
!
! The IR emit for an attribute or subscript target applied the BINARY dunder
! (``__add__:'') to the loaded value, where the text path routes every shape
! through ``___augmentedOp___:inplace:binary:''.  That was a faithful copy of
! the text when cut 62 was written; the text emitters were corrected afterwards
! and the IR one was not, so the emit and its own docstring agreed with each
! other and with nothing else.
!
! WHY THE DIVERGENCE SURVIVED A GREEN SUITE.  Both losses are quiet:
!
!   * a lost IN-PLACE dunder still yields the right value under the target's
!     own name -- ``self.lst'' reads [1, 2] either way.  It is wrong only for a
!     SECOND name bound to the same object, so every list check here also
!     records an alias identity, and TracksInPlace answers which dunder ran so
!     that a fallback cannot reach the right value and look in-place;
!   * a stored NotImplemented is a VALUE, not an error.  It surfaces wherever
!     the attribute is next read, arbitrarily far from the statement at fault.
!
! FORCED, not inherited from the ambient flag.  The text path is correct, so a
! flag-off run exercises none of this and would pass against the broken emit --
! which is exactly what happened: the defect reached main and sat there.
!
! The four shapes are separate branches of the emit and none vouches for
! another: a ``self'' attribute reaches the instance's own storage, a declared
! SLOT its accessor pair, any other receiver the polymorphic attribute
! protocol, and a subscript __getitem__/__setitem__.  The module-scope spelling
! already went through the helper and is pinned by
! AugAssignModuleTargetTestCase.
! ===============================================================================

doit
AugAssignComplexTargetTestCase removeAllMethods.
AugAssignComplexTargetTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: AugAssignComplexTargetTestCase
tearDown
	importlib ___irCodegenEnabledInvalidate___.
	(importlib @env1:modules) removeKey: #'aact_ir' ifAbsent: [].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil].
	self ___forgetCanonicalModule___: 'aact_ir'.
	irModule := nil
%

category: 'Grail-Private'
method: AugAssignComplexTargetTestCase
___fixturePath___
	^ importlib grailDir , '/tests/python/augassign_complex_target.py'
%

category: 'Grail-Private'
method: AugAssignComplexTargetTestCase
___irModule___
	"Forced rather than inherited: the TEXT path is correct here, so a flag-off
	run compiles none of the emit under test and passes whatever it does."

	irModule ifNotNil: [^ irModule].
	(importlib @env1:modules) removeKey: #'aact_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'aact_ir'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irStatsReset___.
	irModule := importlib loadModuleFromPath: self ___fixturePath___ name: 'aact_ir'.
	^ irModule
%

category: 'Grail-Private'
method: AugAssignComplexTargetTestCase
___reprOf___: aKey
	^ ((self ___irModule___ @env1:___pyAttrLoad___: #'r') @env1:__getitem__: aKey)
		@env1:__repr__ @env0:asString
%

category: 'Grail-Private'
method: AugAssignComplexTargetTestCase
___wantOf___: aKey
	^ ((self ___irModule___ @env1:___pyAttrLoad___: #'EXPECTED')
		@env1:__getitem__: aKey) @env1:__repr__ @env0:asString
%

category: 'Grail-Private'
method: AugAssignComplexTargetTestCase
___keys___
	^ #('self_attr_value' 'self_attr_in_place' 'self_attr_reflected_proxy'
	    'self_attr_inplace_dunder_ran' 'self_attr_reflected_custom'
	    'slot_value' 'slot_in_place' 'slot_reflected_custom'
	    'foreign_attr_value' 'foreign_attr_in_place'
	    'foreign_attr_reflected_custom' 'foreign_attr_inplace_dunder_ran'
	    'subscript_value' 'subscript_in_place' 'subscript_reflected_custom'
	    'subscript_inplace_dunder_ran')
%

category: 'Grail-Tests - augmented assignment to an attribute or subscript'
method: AugAssignComplexTargetTestCase
testEveryCheckIsPresentAndAgreesWithCPythonUnderIR
	"The roll-up, NAMED rather than counted: a count tells you something broke
	and not which branch, and the four branches fail independently.  The key
	set is asserted too, so a fixture that stopped recording a check cannot
	shrink the comparison into agreement."

	| bad |
	bad := OrderedCollection new.
	self ___keys___ do: [:k |
		| got want |
		got := self ___reprOf___: k.
		want := self ___wantOf___: k.
		got = want ifFalse: [bad add: k , ': ' , got , ' vs ' , want]].
	self assert: bad isEmpty
		description: 'attribute/subscript augmented assignments disagreeing '
			, 'with CPython under IR: ' , bad asArray printString.
	self assert: (self ___irModule___ @env1:___pyAttrLoad___: #'KEYS')
			@env1:__len__ @env0:asInteger = self ___keys___ size
		description: 'the fixture and this test disagree about how many checks '
			, 'there are'
%

category: 'Grail-Tests - augmented assignment to an attribute or subscript'
method: AugAssignComplexTargetTestCase
testTheInPlaceDunderRunsForEveryShape
	"The half a value check cannot see.  Each of these reads the RIGHT value
	whichever dunder ran; what separates them is whether the object another
	name is bound to was mutated, and -- for the tracker -- which dunder was
	offered first."

	#('self_attr_in_place' 'slot_in_place' 'foreign_attr_in_place'
	  'subscript_in_place') do: [:k |
		self assert: (self ___reprOf___: k) = 'True'
			description: k , ' is False: the augmented assignment rebound its '
				, 'target instead of mutating it'].
	#('self_attr_inplace_dunder_ran' 'foreign_attr_inplace_dunder_ran'
	  'subscript_inplace_dunder_ran') do: [:k |
		self assert: (self ___reprOf___: k) = '[''iadd'']'
			description: k , ' is not [''iadd'']: the binary dunder ran where '
				, 'the in-place one should have']
%

category: 'Grail-Tests - augmented assignment to an attribute or subscript'
method: AugAssignComplexTargetTestCase
testADecliningDunderReachesTheReflectedOne
	"The other half.  A forward dunder answering NotImplemented must fall
	through to the right operand's reflected dunder; an emit that stores what
	the forward one answered writes NotImplemented -- a value, not an error, so
	nothing raises and it surfaces at the next read."

	#('self_attr_reflected_custom' 'slot_reflected_custom'
	  'foreign_attr_reflected_custom' 'subscript_reflected_custom')
		do: [:k | | got |
			got := self ___reprOf___: k.
			self assert: got = '''ror-ran'''
				description: k , ' is ' , got , ', not ''ror-ran'': the '
					, 'reflected dunder was not reached'].
	self assert: (self ___reprOf___: 'self_attr_reflected_proxy')
			= '{0: ''a'', 1: ''c''}'
		description: 'a mapping proxy on the right of |= did not merge'
%
