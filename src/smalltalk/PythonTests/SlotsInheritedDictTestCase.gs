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

category: 'Grail-Tests - slots'
method: SlotsInheritedDictTestCase
testStrictnessIsNotInherited
	"The MIRROR of the rule above, which Grail got wrong in the other
	direction.  CPython gives a class a per-instance __dict__ unless the
	class ITSELF declares __slots__: a slotted base's slot DESCRIPTORS are
	inherited, its ``no __dict__, reject every other name'' property is not.

	Grail emitted the ___pySlotsStrict___ marker once, on the slotted
	ancestor, and every descendant inherited it -- so a subclass declaring
	no __slots__ of its own was strict and could not be given an attribute
	at all:

	    class Base:
	        __slots__ = ()
	    class Sub(Base):
	        def __init__(self): self.x = 1   # AttributeError

	which is what stopped a vendored CPython ipaddress.py, whose
	IPv4Network descends from a base spelled ``__slots__ = ()'' and whose
	__init__ assigns self.network_address (PR #731).

	A class that declares no __slots__ now OVERRIDES the inherited marker
	with false, and the runtime consumers read the marker's VALUE rather
	than merely testing that some ancestor implements it.  ___pyHasSlots___
	stays inherited, so an INHERITED slot name still writes the named
	instVar instead of landing in the dict -- as CPython's inherited slot
	descriptor does, which ``inherited_slot_bypasses_dict'' is what pins.

	The all-slots keys are asserted here as well, not only by the test
	above: the cheap wrong fix for every check in this method is to stop
	enforcing __slots__ at all, and a test that only measures the lenient
	direction cannot tell that fix from this one."

	| mod results |
	importlib @env1:modules removeKey: #'slots_inherited_dict' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/slots_inherited_dict.py')
		name: 'slots_inherited_dict'.
	results := mod @env1:___pyAttrLoad___: #RESULTS.
	#('child_of_empty_slots_assigns' 'child_of_empty_slots_has_dict'
	  'unslotted_child_assigns_arbitrary' 'unslotted_child_has_dict'
	  'inherited_slot_bypasses_dict' 'unslotted_child_setattr_builtin'
	  'unslotted_child_delattr'
	  'reslotted_grandchild_assigns' 'reslotted_grandchild_has_dict'
	  'dict_in_slots_not_strict'
	  'cached_property_unslotted_child' 'cached_property_strict_raises'
	  'all_slots_chain_still_strict' 'all_slots_chain_has_no_dict'
	  'all_slots_chain_slot_works')
		do: [:key |
			self assert: ((results @env1:__getitem__: key) = true) description: key]
%
