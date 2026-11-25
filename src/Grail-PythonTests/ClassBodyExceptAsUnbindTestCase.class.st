"PEP 3110's implicit ``del NAME'' at the end of a class-body ``except E as
NAME'' / ``except* E as NAME'' handler (#2305), and of ``except*'' in a
function and a module.  CPython compiles it as ``NAME = None; del NAME'', so
the class ends without the name; Grail left it bound on the class.

The tests load tests/python/class_body_except_as_unbind.py and compare every
check with CPython's answer on the IR arm (method-local classes built by the
IR helper), with the text helper (GRAIL_IR_CLASS_HELPER=0's force) and on the
text arm, and check that the IR arm built its helpers through IR with no
fallback."
Class {
	#name : 'ClassBodyExceptAsUnbindTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
ClassBodyExceptAsUnbindTestCase >> ___disagreementsOf___: aModule [
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
ClassBodyExceptAsUnbindTestCase >> ___helpersOf___: aClass [
	"aClass's class-statement helpers, env 1: selector -> method."

	| out |
	out := KeyValueDictionary new.
	(aClass methodDictForEnv: 1) ifNotNil: [:md |
		md keysAndValuesDo: [:sel :meth |
			(sel beginsWith: '___irClassDef_') ifTrue: [out at: sel put: meth]]].
	^ out

]

{ #category : 'Grail-Helpers' }
ClassBodyExceptAsUnbindTestCase >> ___keys___ [

	^ #('bound_before_l' 'bound_before_m' 'closure_l' 'del_after' 'del_in_handler_l'
		'del_in_handler_m' 'else_finally_l' 'in_with_if_m' 'loop_exit_l' 'loop_exit_m'
		'mangled_m' 'nested_l' 'nested_m' 'plain_l' 'plain_m' 'prepare_l' 'read_after'
		'rebound_m' 'reraise_l' 'reraise_m' 'shadows_global_l' 'shadows_global_m'
		'star_function' 'star_l' 'star_m' 'star_module' 'star_reraise_l' 'two_handlers_l')

]

{ #category : 'Grail-Helpers' }
ClassBodyExceptAsUnbindTestCase >> ___load___: irCodegen helperIR: helperIR [
	"The fixture, freshly compiled: on the IR arm (irCodegen true) with its
	method-local class helpers built through IR or (helperIR false) compiled
	from text, or on the text arm."

	(importlib @env1:modules) removeKey: #'cbeau' ifAbsent: [].
	self ___forgetCanonicalModule___: 'cbeau'.
	importlib ___irCodegenForce___: irCodegen.
	importlib ___irClassHelperIRForce___: helperIR.
	importlib ___irStatsReset___.
	^ importlib
		loadModuleFromPath: importlib grailDir , '/tests/python/class_body_except_as_unbind.py'
		name: 'cbeau'

]

{ #category : 'Grail-Setup' }
ClassBodyExceptAsUnbindTestCase >> tearDown [

	importlib ___irCodegenEnabledInvalidate___.
	importlib ___irStatsReset___.
	(importlib @env1:modules) removeKey: #'cbeau' ifAbsent: [].
	self ___forgetCanonicalModule___: 'cbeau'.
	super tearDown

]

{ #category : 'Grail-Tests' }
ClassBodyExceptAsUnbindTestCase >> testTheFixtureAgreesWithCPython [
	"Every check on the IR arm, the method-local classes built by IR helpers,
	and nothing fell back to text."

	| bad stats helpers |
	importlib ___irCodegenSupported___ ifFalse: [^ self].
	bad := self ___disagreementsOf___: (self ___load___: true helperIR: true).
	self assert: bad isEmpty
		description: 'class-body except-as cleanup disagreeing with CPython under IR: '
			, bad asArray printString.
	stats := importlib ___irStats___.
	self assert: (stats at: #fallbacks) = 0
		description: 'IR fell back to text: ' , (stats at: #lastError) printString.
	helpers := self ___helpersOf___:
		((importlib @env1:modules) @env1:__getitem__: 'cbeau') class.
	self assert: helpers size >= 15
		description: 'expected the helpers on the module class, found '
			, helpers keys asArray printString.
	helpers keysAndValuesDo: [:sel :meth |
		self assert: (BaseException ___isIRPythonMethod___: meth)
			description: sel , ' was compiled from text']

]

{ #category : 'Grail-Tests' }
ClassBodyExceptAsUnbindTestCase >> testTheTextArmAgreesWithCPython [
	"Every check with IR codegen off (GRAIL_IR_CODEGEN=0's arm), where a
	method-local class is built inline in its enclosing method's text."

	| bad |
	bad := self ___disagreementsOf___: (self ___load___: false helperIR: false).
	self assert: bad isEmpty
		description: 'class-body except-as cleanup disagreeing with CPython on the text arm: '
			, bad asArray printString

]

{ #category : 'Grail-Tests' }
ClassBodyExceptAsUnbindTestCase >> testTheTextHelperAgreesWithCPython [
	"Every check on the IR arm with the method-local class helpers compiled
	from text (GRAIL_IR_CLASS_HELPER=0's force)."

	| bad |
	importlib ___irCodegenSupported___ ifFalse: [^ self].
	bad := self ___disagreementsOf___: (self ___load___: true helperIR: false).
	self assert: bad isEmpty
		description: 'class-body except-as cleanup disagreeing with CPython with the text helper: '
			, bad asArray printString

]
