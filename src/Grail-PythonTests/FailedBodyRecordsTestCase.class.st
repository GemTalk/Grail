"
A module body that fails writes none of the records its run made
(importlib ___discardBodyRecordsOf___:).  They are written when the body is
popped, in the load's ensure:, which runs as the stack unwinds -- after a
handler further out.  An install's redeploy handles a failed rebuild by
aborting and then counting stored instances in the clean transaction; the
failed run's records, written after its abort, made the session dirty again
and left a base change refused that the install should have rebuilt
(email.message, upgrading from c8cbc92).
"
Class {
	#name : 'FailedBodyRecordsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'path',
		'snapshot'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
FailedBodyRecordsTestCase >> load: aRevision [
	"Write revision aRevision of the fixture to the module's file and load it."

	| f src |
	src := (GsFile openReadOnServer:
		importlib grailDir , '/tests/python/failed_body_records/' , aRevision , '.py') contents.
	f := GsFile openWriteOnServer: path.
	f nextPutAll: src.
	f close.
	(importlib @env1:modules) removeKey: self moduleName asSymbol ifAbsent: [].
	^ importlib loadModuleFromPath: path name: self moduleName

]

{ #category : 'Grail-Helpers' }
FailedBodyRecordsTestCase >> loadFailing [
	"Load the revision whose body raises, as the redeploy does: the failure is
	handled further out."

	| raised |
	raised := false.
	[self load: 'v2']
		on: Error , BaseException
		do: [:e | raised := true. e return: nil].
	self assert: raised description: 'the v2 body did not fail'

]

{ #category : 'Grail-Helpers' }
FailedBodyRecordsTestCase >> moduleName [
	^ 'grail_failed_body_records'

]

{ #category : 'Grail-Helpers' }
FailedBodyRecordsTestCase >> recordedSignatureNames [
	"The parameter names recorded for f, or nil when the module has no record."

	| reg rec sigs |
	reg := importlib ___grailNamespace___ at: #'GrailCanonicalFunctionMeta' otherwise: nil.
	reg isNil ifTrue: [^ nil].
	rec := reg at: self moduleName otherwise: nil.
	rec isNil ifTrue: [^ nil].
	sigs := rec at: #'signatures' otherwise: nil.
	sigs isNil ifTrue: [^ nil].
	^ ((sigs at: 'f' otherwise: #()) collect: [:param | param first]) asArray

]

{ #category : 'Grail-Setup' }
FailedBodyRecordsTestCase >> setUp [
	"Per-user path: several worktrees share one stone and /tmp."
	path := '/tmp/grail_failed_body_records_' , System myUserProfile userId asString , '.py'.
	snapshot := importlib ___canonicalRegistrySnapshot___.
	self ___forgetCanonicalModule___: self moduleName

]

{ #category : 'Grail-Setup' }
FailedBodyRecordsTestCase >> tearDown [
	[GsFile removeServerFile: path] on: Error do: [:e | ].
	(importlib @env1:modules) removeKey: self moduleName asSymbol ifAbsent: [].
	self ___forgetCanonicalModule___: self moduleName.
	snapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		snapshot := nil]

]

{ #category : 'Grail-Tests' }
FailedBodyRecordsTestCase >> testAFailedBodyWritesNoRecord [
	"A first run that fails leaves no record, though it recorded f's signature
	before it raised."

	self loadFailing.
	self assert: self recordedSignatureNames isNil

]

{ #category : 'Grail-Tests' }
FailedBodyRecordsTestCase >> testAFailedRebuildKeepsTheCompletedRunsRecord [
	"A rebuild that fails leaves the record the last completed run wrote: f
	takes (a, b), not the failed revision's (a, b, c)."

	self load: 'v1'.
	self assert: self recordedSignatureNames equals: #('a' 'b').
	self loadFailing.
	self assert: self recordedSignatureNames equals: #('a' 'b')

]
