! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'SlotsInheritedDictTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
SlotsInheritedDictTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! SlotsInheritedDictTestCase - __slots__ removes the __dict__ only when the
! WHOLE mro declares it; and slot values must participate in pickling.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
SlotsInheritedDictTestCase removeAllMethods.
SlotsInheritedDictTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - slots'
method: SlotsInheritedDictTestCase
testSlotsKeepInheritedDictAndPickle
	"Two halves of the same gap.

	CPython drops the per-instance __dict__ only when EVERY class in the mro
	except object declares __slots__.  A slotted class with a PLAIN base
	still HAS one, so an attribute the base's __init__ assigns keeps
	working.  Grail decided strictness from the class's OWN declaration
	alone, so such a class could not even be constructed -- which is what
	took out datetimetester's PicklableFixedOffsetWithSlots, whose
	__slots__ deliberately omits the base's third private attribute.
	Strictness is now settled at class-creation time by walking the
	superclass chain: only PYTHON-DEFINED ancestors count, so a Grail
	builtin base (property, a numbers ABC) does not wrongly block it --
	getting that wrong made Fraction and a property subclass non-strict.

	And __slots__ values live in NAMED instance variables, not in the
	dynamic ones __getstate__ read, so they were absent from the pickle
	state entirely and a slotted instance came back with every slot unset.
	__getstate__ now answers CPython's (dict, slots) 2-tuple -- which
	pickle.py's BUILD already restores -- and tzinfo's own __reduce__
	delegates to it instead of rebuilding the dict half by hand."

	| mod results |
	importlib @env1:modules removeKey: #'slots_inherited_dict' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/slots_inherited_dict.py')
		name: 'slots_inherited_dict'.
	results := mod @env1:___pyAttrLoad___: #RESULTS.
	#('slot_attr_reads' 'non_slot_attr_reads' 'has_dict' 'unset_slot_absent'
	  'can_assign_new_attr'
	  'all_slots_chain_still_strict' 'all_slots_chain_has_no_dict'
	  'all_slots_chain_slot_works'
	  'mangled_slot_reads' 'mangled_slot_name_reads' 'mangled_non_slot_reads'
	  'getstate_is_pair' 'getstate_dict_half' 'getstate_slots_half'
	  'roundtrip_slot_proto2' 'roundtrip_name_proto2'
	  'roundtrip_nonslot_proto2' 'roundtrip_no_spam_proto2'
	  'roundtrip_slot_proto5' 'roundtrip_name_proto5'
	  'roundtrip_nonslot_proto5' 'roundtrip_no_spam_proto5'
	  'plain_getstate_not_pair') do: [:key |
		self assert: ((results @env1:__getitem__: key) = true) description: key]
%
