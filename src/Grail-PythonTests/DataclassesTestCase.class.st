Class {
	#name : 'DataclassesTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-dataclasses' }
DataclassesTestCase >> loadFixture [
	"Load tests/python/use_dataclasses.py fresh and return the module
	instance.  Drops any cached registration first so each run picks up
	source edits."

	| mods |
	mods := importlib @env1:modules.
	"Drop the fixture AND the dataclasses module so each run reflects
	the current on-disk dataclasses.py (a stale cached copy would mask
	source edits)."
	mods removeKey: #'use_dataclasses' ifAbsent: [].
	mods removeKey: #'dataclasses' ifAbsent: [].
	^ importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/use_dataclasses.py')
		name: 'use_dataclasses'

]

{ #category : 'Grail-Tests-dataclasses' }
DataclassesTestCase >> testConstruction [
	"@dataclass synthesizes __init__ that binds fields positionally
	and by keyword, and raises on a missing required argument."

	| mod |
	mod := self loadFixture.
	self assert: mod @env1:construct_sets_attrs equals: true.
	self assert: mod @env1:construct_by_keyword equals: true.
	self assert: mod @env1:missing_required_arg_raises equals: true

]

{ #category : 'Grail-Tests-dataclasses' }
DataclassesTestCase >> testConversion [
	"asdict / astuple / replace against a decorated class."

	| mod |
	mod := self loadFixture.
	self assert: mod @env1:asdict_roundtrip equals: true.
	self assert: mod @env1:astuple_roundtrip equals: true.
	self assert: mod @env1:replace_overrides_one_field equals: true

]

{ #category : 'Grail-Tests-dataclasses' }
DataclassesTestCase >> testDefaults [
	"Fields with a default value and field(default_factory=...) — the
	full field layout (incl. defaulted fields) is recovered via the
	ClassDefAst ___annotatedFields___ accessor, and the synthesized
	__init__ applies the default / calls the factory per instance."

	| mod |
	mod := self loadFixture.
	self assert: mod @env1:defaults_field_order equals: true.
	self assert: mod @env1:default_simple_value equals: true.
	self assert: mod @env1:default_factory_produces_value equals: true.
	self assert: mod @env1:default_factory_per_instance equals: true.
	self assert: mod @env1:defaults_are_overridable equals: true.
	self assert: mod @env1:required_field_still_required equals: true

]

{ #category : 'Grail-Tests-dataclasses' }
DataclassesTestCase >> testEquality [
	"== / != reach the synthesized __eq__ via the object>>__eq__ /
	__ne__ dynamic-dunder probe (structural equality across fields)."

	| mod |
	mod := self loadFixture.
	self assert: mod @env1:eq_equal_instances equals: true.
	self assert: mod @env1:eq_unequal_instances equals: true.
	self assert: mod @env1:ne_unequal_instances equals: true.
	self assert: mod @env1:ne_equal_instances equals: true

]

{ #category : 'Grail-Tests-dataclasses' }
DataclassesTestCase >> testIntrospection [
	"is_dataclass on class + instance, and fields() declaration order."

	| mod |
	mod := self loadFixture.
	self assert: mod @env1:is_dataclass_class equals: true.
	self assert: mod @env1:is_dataclass_instance equals: true.
	self assert: mod @env1:fields_names equals: true

]

{ #category : 'Grail-Tests-dataclasses' }
DataclassesTestCase >> testRepr [
	"repr() reaches the setattr-installed synthesized __repr__ via the
	object>>__repr__ dynamic-dunder probe."

	| mod |
	mod := self loadFixture.
	self assert: mod @env1:repr_is_synthesized equals: true

]
