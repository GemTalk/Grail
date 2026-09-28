! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'BodyClassAttrReplayTestCase'
  instVarNames: #( probeClass )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
BodyClassAttrReplayTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! BodyClassAttrReplayTestCase - a module body's store on a canonical class is
! recorded and replayed in a session that binds the deployed module.
!
! A store on a canonical class goes to the session-local overlay (Persistent
! Modules D3), which is right for runtime mutation and wrong for a module body:
! a binding session never runs the body.  typing's
! ``ByteString = _DeprecatedGenericAlias(..., removal_version=(3, 17))'' forwards
! ``_removal_version'' onto collections.abc.ByteString, and once typing was
! deployed test_typing's test_bytestring raised AttributeError.  jinja2's
! ``Environment.template_class = Template'' was lost the same way.
!
! The real shape -- deploy, commit, bind in a fresh session -- needs two sessions;
! these tests drive the record and the replay directly, on a throwaway class, and
! clean both the committed record and the overlay up afterwards.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
BodyClassAttrReplayTestCase removeAllMethods.
BodyClassAttrReplayTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Private'
method: BodyClassAttrReplayTestCase
probeModule
	^ 'grail_body_class_attr_replay_probe'
%

category: 'Grail-Private'
method: BodyClassAttrReplayTestCase
setUp
	super setUp.
	probeClass := Object subclass: 'GrailBodyClassAttrProbe'
		instVarNames: #() classVars: #() classInstVars: #()
		poolDictionaries: #() inDictionary: nil options: #()
%

category: 'Grail-Private'
method: BodyClassAttrReplayTestCase
tearDown
	| st ov done |
	importlib ___forgetBodyClassAttrsOf___: self probeModule.
	st := SessionTemps current.
	ov := st at: #'GrailClassAttrOverlay' otherwise: nil.
	ov isNil ifFalse: [ov removeKey: probeClass ifAbsent: []].
	done := st at: #'GrailBodyClassAttrsReplayed' otherwise: nil.
	done isNil ifFalse: [done remove: self probeModule ifAbsent: []].
	super tearDown
%

category: 'Grail-Private'
method: BodyClassAttrReplayTestCase
recordFromTheProbeBody: aBlock
	"Run aBlock as though the probe module's body were executing."
	importlib ___pushInitializingModule___: self probeModule.
	aBlock ensure: [importlib ___popInitializingModule___]
%

category: 'Grail-Private'
method: BodyClassAttrReplayTestCase
overlayAt: aSym
	| ov inner |
	ov := SessionTemps current at: #'GrailClassAttrOverlay' otherwise: nil.
	ov isNil ifTrue: [^ #absent].
	inner := ov at: probeClass otherwise: nil.
	inner isNil ifTrue: [^ #absent].
	^ inner at: aSym otherwise: #absent
%

category: 'Grail-Private'
method: BodyClassAttrReplayTestCase
simulateABindingSession
	"What a session that never ran the body has: no overlay entry, and the
	module not yet replayed."
	| st ov done |
	st := SessionTemps current.
	ov := st at: #'GrailClassAttrOverlay' otherwise: nil.
	ov isNil ifFalse: [ov removeKey: probeClass ifAbsent: []].
	done := st at: #'GrailBodyClassAttrsReplayed' otherwise: nil.
	done isNil ifFalse: [done remove: self probeModule ifAbsent: []].
	importlib ___restoreAllBodyClassAttrs___
%

category: 'Grail-Tests - replay'
method: BodyClassAttrReplayTestCase
testAPlainDataStoreIsReplayed

	| version |
	version := tuple withAll: #(3 17).
	self recordFromTheProbeBody: [
		importlib ___recordBodyClassAttr___: probeClass name: #'_removal_version' value: version.
		importlib ___recordBodyClassAttr___: probeClass name: #'template_class' value: Object].
	self simulateABindingSession.
	self assert: (self overlayAt: #'_removal_version') identical: version.
	self assert: (self overlayAt: #'template_class') identical: Object
%

category: 'Grail-Tests - replay'
method: BodyClassAttrReplayTestCase
testSessionObjectsAndAbcStampsAreNotRecorded
	"The record commits with a deployment, so only plain data goes in; abc's
	negative-cache stamp is bookkeeping for a cache that is not replayed."

	self recordFromTheProbeBody: [
		importlib ___recordBodyClassAttr___: probeClass name: #'lock' value: Semaphore new.
		importlib ___recordBodyClassAttr___: probeClass
			name: #'_abc_negative_cache_version' value: 18].
	self simulateABindingSession.
	self assert: (self overlayAt: #'lock') equals: #absent.
	self assert: (self overlayAt: #'_abc_negative_cache_version') equals: #absent
%

category: 'Grail-Tests - replay'
method: BodyClassAttrReplayTestCase
testAStoreOutsideAModuleBodyIsNotRecorded

	importlib ___recordBodyClassAttr___: probeClass name: #'runtime' value: 1.
	self simulateABindingSession.
	self assert: (self overlayAt: #'runtime') equals: #absent
%

category: 'Grail-Tests - replay'
method: BodyClassAttrReplayTestCase
testReplayNeverOverwritesThisSessionsStore

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
%

category: 'Grail-Tests - replay'
method: BodyClassAttrReplayTestCase
testRerunningTheBodyForgetsTheOldRecord

	self recordFromTheProbeBody: [
		importlib ___recordBodyClassAttr___: probeClass name: #'old' value: 1].
	self recordFromTheProbeBody: [
		importlib ___recordBodyClassAttr___: probeClass name: #'new' value: 2].
	self simulateABindingSession.
	self assert: (self overlayAt: #'old') equals: #absent.
	self assert: (self overlayAt: #'new') equals: 2
%
