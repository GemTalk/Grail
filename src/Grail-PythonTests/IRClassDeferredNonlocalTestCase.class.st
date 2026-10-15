Class {
	#name : 'IRClassDeferredNonlocalTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'irModule',
		'irRegistrySnapshot'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
IRClassDeferredNonlocalTestCase >> ___got___: aKey [
	^ ((self ___irModule___ @env1:___pyAttrLoad___: #'r') @env1:__getitem__: aKey) asString

]

{ #category : 'Grail-Private' }
IRClassDeferredNonlocalTestCase >> ___irModule___ [
	irModule ifNotNil: [^ irModule].
	(importlib @env1:modules) removeKey: #'icdn_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'icdn_ir'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	irModule := importlib
		loadModuleFromPath: importlib grailDir , '/tests/python/ir_class_deferred_nonlocal.py'
		name: 'icdn_ir'.
	^ irModule

]

{ #category : 'Grail-Private' }
IRClassDeferredNonlocalTestCase >> ___isIRBuilt___: aSelector [
	| meth |
	meth := self ___irModule___ class compiledMethodAt: aSelector environmentId: 1
		otherwise: nil.
	self assert: meth notNil description: 'no method for ' , aSelector printString.
	^ BaseException ___isIRPythonMethod___: meth

]

{ #category : 'Grail-Private' }
IRClassDeferredNonlocalTestCase >> ___want___: aKey [
	^ ((self ___irModule___ @env1:___pyAttrLoad___: #'EXPECTED') @env1:__getitem__: aKey) asString

]

{ #category : 'Grail-Setup' }
IRClassDeferredNonlocalTestCase >> tearDown [
	importlib ___irCodegenEnabledInvalidate___.
	(importlib @env1:modules) removeKey: #'icdn_ir' ifAbsent: [].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil].
	self ___forgetCanonicalModule___: 'icdn_ir'.
	irModule := nil

]

{ #category : 'Grail-Tests - deferred reads of a class body nonlocal' }
IRClassDeferredNonlocalTestCase >> testALateReadSeesTheBindingAtReadTime [
	"Each of these reads the name AFTER the class statement ran; each saw the
	helper's copy from that moment instead of the binding."

	#('lambda_after_enclosing_changes' 'lambda_bound_only_after'
	  'genexp_after_enclosing_changes' 'annotation_forward_ref') do: [:k |
		self assert: (self ___got___: k) = (self ___want___: k)
			description: k , ' answered ' , (self ___got___: k) , ', not '
				, (self ___want___: k)]

]

{ #category : 'Grail-Tests - deferred reads of a class body nonlocal' }
IRClassDeferredNonlocalTestCase >> testEveryCheckAgreesWithCPythonUnderIR [
	self
		assert: (self ___irModule___ @env1:___pyAttrLoad___: #'SUMMARY') asString
		equals: '5 checks, 0 disagreeing [], keys match: True'

]

{ #category : 'Grail-Tests - deferred reads of a class body nonlocal' }
IRClassDeferredNonlocalTestCase >> testTheRefusalIsNarrow [
	"The positive control.  A class that declares ``nonlocal'' and reads it only
	eagerly has nothing to fear from the copy, and must stay on the IR path;
	each shape that reads it late must not be on it."

	self assert: (self ___isIRBuilt___: #write_then_read)
		description: 'write_then_read fell back to text: the refusal is too broad'.
	self assert: (self ___got___: 'write_then_read') = (self ___want___: 'write_then_read')
		description: 'write_then_read answered ' , (self ___got___: 'write_then_read').
	#(#lambda_after_enclosing_changes #lambda_bound_only_after
	  #genexp_after_enclosing_changes #annotation_forward_ref) do: [:sel |
		self deny: (self ___isIRBuilt___: sel)
			description: sel , ' was IR-built despite a late read of its nonlocal']

]
