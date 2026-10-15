Class {
	#name : 'BodyClassAttrReplayTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'probeClass'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
BodyClassAttrReplayTestCase >> overlayAt: aSym [
	| ov inner |
	ov := SessionTemps current at: #'GrailClassAttrOverlay' otherwise: nil.
	ov isNil ifTrue: [^ #absent].
	inner := ov at: probeClass otherwise: nil.
	inner isNil ifTrue: [^ #absent].
	^ inner at: aSym otherwise: #absent

]

{ #category : 'Grail-Private' }
BodyClassAttrReplayTestCase >> probeModule [
	^ 'grail_body_class_attr_replay_probe'

]

{ #category : 'Grail-Private' }
BodyClassAttrReplayTestCase >> recordFromTheProbeBody: aBlock [
	"Run aBlock as though the probe module's body were executing."
	importlib ___pushInitializingModule___: self probeModule.
	aBlock ensure: [importlib ___popInitializingModule___]

]

{ #category : 'Grail-Private' }
BodyClassAttrReplayTestCase >> setUp [
	super setUp.
	probeClass := Object subclass: 'GrailBodyClassAttrProbe'
		instVarNames: #() classVars: #() classInstVars: #()
		poolDictionaries: #() inDictionary: nil options: #()

]

{ #category : 'Grail-Private' }
BodyClassAttrReplayTestCase >> simulateABindingSession [
	"What a session that never ran the body has: no overlay entry, and the
	module not yet replayed."
	| st ov done |
	st := SessionTemps current.
	ov := st at: #'GrailClassAttrOverlay' otherwise: nil.
	ov isNil ifFalse: [ov removeKey: probeClass ifAbsent: []].
	done := st at: #'GrailBodyClassAttrsReplayed' otherwise: nil.
	done isNil ifFalse: [done remove: self probeModule ifAbsent: []].
	importlib ___restoreAllBodyClassAttrs___

]

{ #category : 'Grail-Private' }
BodyClassAttrReplayTestCase >> tearDown [
	| st ov done |
	importlib ___forgetBodyClassAttrsOf___: self probeModule.
	st := SessionTemps current.
	ov := st at: #'GrailClassAttrOverlay' otherwise: nil.
	ov isNil ifFalse: [ov removeKey: probeClass ifAbsent: []].
	done := st at: #'GrailBodyClassAttrsReplayed' otherwise: nil.
	done isNil ifFalse: [done remove: self probeModule ifAbsent: []].
	super tearDown

]

{ #category : 'Grail-Tests - replay' }
BodyClassAttrReplayTestCase >> testAPlainDataStoreIsReplayed [

	| version |
	version := tuple withAll: #(3 17).
	self recordFromTheProbeBody: [
		importlib ___recordBodyClassAttr___: probeClass name: #'_removal_version' value: version.
		importlib ___recordBodyClassAttr___: probeClass name: #'template_class' value: Object].
	self simulateABindingSession.
	self assert: (self overlayAt: #'_removal_version') identical: version.
	self assert: (self overlayAt: #'template_class') identical: Object

]

{ #category : 'Grail-Tests - replay' }
BodyClassAttrReplayTestCase >> testAStoreOutsideAModuleBodyIsNotRecorded [

	importlib ___recordBodyClassAttr___: probeClass name: #'runtime' value: 1.
	self simulateABindingSession.
	self assert: (self overlayAt: #'runtime') equals: #absent

]

{ #category : 'Grail-Tests - replay' }
BodyClassAttrReplayTestCase >> testReplayNeverOverwritesThisSessionsStore [

	| ov inner |
	self recordFromTheProbeBody: [
		importlib ___recordBodyClassAttr___: probeClass name: #'x' value: 1].
	ov := SessionTemps current at: #'GrailClassAttrOverlay' ifAbsentPut: [IdentityKeyValueDictionary new].
	inner := ov at: probeClass ifAbsentPut: [KeyValueDictionary new].
	inner at: #'x' put: 2.
	(SessionTemps current at: #'GrailBodyClassAttrsReplayed' otherwise: nil)
		ifNotNil: [:done | done remove: self probeModule ifAbsent: []].
	importlib ___restoreAllBodyClassAttrs___.
	self assert: (self overlayAt: #'x') equals: 2

]

{ #category : 'Grail-Tests - replay' }
BodyClassAttrReplayTestCase >> testRerunningTheBodyForgetsTheOldRecord [

	self recordFromTheProbeBody: [
		importlib ___recordBodyClassAttr___: probeClass name: #'old' value: 1].
	self recordFromTheProbeBody: [
		importlib ___recordBodyClassAttr___: probeClass name: #'new' value: 2].
	self simulateABindingSession.
	self assert: (self overlayAt: #'old') equals: #absent.
	self assert: (self overlayAt: #'new') equals: 2

]

{ #category : 'Grail-Tests - replay' }
BodyClassAttrReplayTestCase >> testSessionObjectsAndAbcStampsAreNotRecorded [
	"The record commits with a deployment, so only plain data goes in; abc's
	negative-cache stamp is bookkeeping for a cache that is not replayed."

	self recordFromTheProbeBody: [
		importlib ___recordBodyClassAttr___: probeClass name: #'lock' value: Semaphore new.
		importlib ___recordBodyClassAttr___: probeClass
			name: #'_abc_negative_cache_version' value: 18].
	self simulateABindingSession.
	self assert: (self overlayAt: #'lock') equals: #absent.
	self assert: (self overlayAt: #'_abc_negative_cache_version') equals: #absent

]
