"An import whose module body is unwound without an exception passing through
the loader leaves no half-built module in sys.modules.

The loader unloaded a module only from its exception handler, which lets a
Notification go on so that the body can resume.  A handler further out that
returned from that notification, or a terminated process, unwound the body
past the handler, and the module stayed registered without the globals its
body had not reached: a full SUnit run intermittently answered an
encodings.utf_16_le without even ``codecs'', and pyexpat's next UTF-16 decode
raised NameError.  CPython removes a module whose load did not finish
(Lib/importlib/_bootstrap.py:938-944, in _load_unlocked)."
Class {
	#name : 'InterruptedImportTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'path',
		'snapshot'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
InterruptedImportTestCase >> isRegistered [

	(importlib @env1:modules) at: #'grail_interrupted_import' ifAbsent: [^ false].
	^ true

]

{ #category : 'Grail-Setup' }
InterruptedImportTestCase >> setUp [
	"Per-user path: several worktrees share one stone and /tmp.  The body
	sleeps between its two bindings, so the import can be stopped inside it."

	| file lf |
	path := '/tmp/grail_interrupted_import_' , System myUserProfile userId asString , '.py'.
	snapshot := importlib ___canonicalRegistrySnapshot___.
	lf := String with: Character lf.
	file := GsFile openWriteOnServer: path.
	file nextPutAll: 'import time' , lf , 'first = 1' , lf , 'time.sleep(2)' , lf , 'second = 2' , lf.
	file close.
	(importlib @env1:modules) removeKey: #'grail_interrupted_import' ifAbsent: []

]

{ #category : 'Grail-Setup' }
InterruptedImportTestCase >> tearDown [

	[GsFile removeServerFile: path] on: Error do: [:e | ].
	(importlib @env1:modules) removeKey: #'grail_interrupted_import' ifAbsent: [].
	self ___forgetCanonicalModule___: 'grail_interrupted_import'.
	snapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		snapshot := nil]

]

{ #category : 'Grail-Tests' }
InterruptedImportTestCase >> testATerminatedImportLeavesNoModuleBehind [

	| importing |
	importing := [importlib loadModuleFromPath: path name: 'grail_interrupted_import'] fork.
	(Delay forMilliseconds: 500) wait.
	importing terminate.
	self deny: self isRegistered

]
