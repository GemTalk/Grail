"Class-body stores the attribute pairs cannot express (#2304, #2340): a store
through an attribute whose receiver is not a nested class or a def of the same
body, a chain with a target that is not a name, a starred or mixed unpack, and
an augmented store through an attribute or a subscript.  CPython runs each as a
statement at its own place in the body; Grail dropped them, with no error.

The tests load tests/python/class_body_unpaired_stores.py and compare every
check with CPython's answer on the IR arm (method-local classes built by the
IR helper), with the text helper (GRAIL_IR_CLASS_HELPER=0's force) and on the
text arm, and check that the IR arm built its helpers through IR with no
fallback."
Class {
	#name : 'ClassBodyUnpairedStoresTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
ClassBodyUnpairedStoresTestCase >> ___disagreementsOf___: aModule [
	"The fixture's checks that disagree with CPython, as printable lines."

	| r expected bad |
	r := aModule @env1:___pyAttrLoad___: #'r'.
	expected := aModule @env1:___pyAttrLoad___: #'EXPECTED'.
	bad := OrderedCollection new.
	self ___keys___ do: [:k |
		| got want |
		got := (r @env1:__getitem__: k) @env1:__repr__ @env0:asString.
		want := (expected @env1:__getitem__: k) @env1:__repr__ @env0:asString.
		got = want ifFalse: [bad add: k , ': ' , got , ' vs ' , want]].
	^ bad

]

{ #category : 'Grail-Helpers' }
ClassBodyUnpairedStoresTestCase >> ___helpersOf___: aClass [
	"aClass's class-statement helpers, env 1: selector -> method."

	| out |
	out := KeyValueDictionary new.
	(aClass methodDictForEnv: 1) ifNotNil: [:md |
		md keysAndValuesDo: [:sel :meth |
			(sel beginsWith: '___irClassDef_') ifTrue: [out at: sel put: meth]]].
	^ out

]

{ #category : 'Grail-Helpers' }
ClassBodyUnpairedStoresTestCase >> ___keys___ [

	^ #('annotated_attr_l' 'attr_body_name_l' 'attr_body_name_m' 'attr_chained_m'
		'attr_enclosing_l' 'attr_global_m' 'attr_param_self_l' 'attr_self_like_l' 'aug_l'
		'aug_m' 'eval_order_l' 'in_blocks_l' 'in_blocks_m' 'issue_2340_l' 'issue_2340_m'
		'mangled_l' 'mixed_l' 'mixed_m' 'name_error_l' 'nested_class_m' 'order_m'
		'prepare_l' 'raises_bound_m' 'raises_m' 'rebind_l' 'sibling_def_l'
		'unpack_raises_l')

]

{ #category : 'Grail-Helpers' }
ClassBodyUnpairedStoresTestCase >> ___load___: irCodegen helperIR: helperIR [
	"The fixture, freshly compiled: on the IR arm (irCodegen true) with its
	method-local class helpers built through IR or (helperIR false) compiled
	from text, or on the text arm."

	(importlib @env1:modules) removeKey: #'cbups' ifAbsent: [].
	self ___forgetCanonicalModule___: 'cbups'.
	importlib ___irCodegenForce___: irCodegen.
	importlib ___irClassHelperIRForce___: helperIR.
	importlib ___irStatsReset___.
	^ importlib
		loadModuleFromPath: importlib grailDir , '/tests/python/class_body_unpaired_stores.py'
		name: 'cbups'

]

{ #category : 'Grail-Setup' }
ClassBodyUnpairedStoresTestCase >> tearDown [

	importlib ___irCodegenEnabledInvalidate___.
	importlib ___irStatsReset___.
	(importlib @env1:modules) removeKey: #'cbups' ifAbsent: [].
	self ___forgetCanonicalModule___: 'cbups'.
	super tearDown

]

{ #category : 'Grail-Tests' }
ClassBodyUnpairedStoresTestCase >> testTheFixtureAgreesWithCPython [
	"Every check on the IR arm, the method-local classes built by IR helpers,
	and nothing fell back to text."

	| bad stats helpers |
	importlib ___irCodegenSupported___ ifFalse: [^ self].
	bad := self ___disagreementsOf___: (self ___load___: true helperIR: true).
	self assert: bad isEmpty
		description: 'class-body stores disagreeing with CPython under IR: '
			, bad asArray printString.
	stats := importlib ___irStats___.
	self assert: (stats at: #fallbacks) = 0
		description: 'IR fell back to text: ' , (stats at: #lastError) printString.
	helpers := self ___helpersOf___:
		((importlib @env1:modules) @env1:__getitem__: 'cbups') class.
	self assert: helpers size >= 16
		description: 'expected the helpers on the module class, found '
			, helpers keys asArray printString.
	helpers keysAndValuesDo: [:sel :meth |
		self assert: (BaseException ___isIRPythonMethod___: meth)
			description: sel , ' was compiled from text']

]

{ #category : 'Grail-Tests' }
ClassBodyUnpairedStoresTestCase >> testTheTextArmAgreesWithCPython [
	"Every check with IR codegen off (GRAIL_IR_CODEGEN=0's arm), where a
	method-local class is built inline in its enclosing method's text."

	| bad |
	bad := self ___disagreementsOf___: (self ___load___: false helperIR: false).
	self assert: bad isEmpty
		description: 'class-body stores disagreeing with CPython on the text arm: '
			, bad asArray printString

]

{ #category : 'Grail-Tests' }
ClassBodyUnpairedStoresTestCase >> testTheTextHelperAgreesWithCPython [
	"Every check on the IR arm with the method-local class helpers compiled
	from text (GRAIL_IR_CLASS_HELPER=0's force)."

	| bad |
	importlib ___irCodegenSupported___ ifFalse: [^ self].
	bad := self ___disagreementsOf___: (self ___load___: true helperIR: false).
	self assert: bad isEmpty
		description: 'class-body stores disagreeing with CPython with the text helper: '
			, bad asArray printString

]
