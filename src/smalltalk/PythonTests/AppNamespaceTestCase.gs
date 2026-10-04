! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for AppNamespaceTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'AppNamespaceTestCase'
  instVarNames: #( appName path hadApps )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
AppNamespaceTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! AppNamespaceTestCase - the name-keyed registries live in a namespace
! ===============================================================================
! Cut 1 of docs/App_Namespaces_Design.md: every name-keyed canonical registry
! accessor reads importlib class >> ___grailNamespace___, which is UserGlobals --
! the default namespace, where the registries always lived -- until an app is
! made current (___grailUseApp___:, the internal half of gemdb.set_app).  With
! no app set nothing changes: the accessors answer the very objects they did.
! With one set, the module instances, hashes and canonical classes a load
! records go to the app's own registries and leave the default's untouched.
!
! Never commits.  The app is created in the test's transaction and removed in
! tearDown, with the session returned to the default namespace.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
AppNamespaceTestCase removeAllMethods.
AppNamespaceTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: AppNamespaceTestCase
setUp
	"Per-user names: several worktrees share one stone and /tmp."
	appName := 'grail_test_app_' , System myUserProfile userId asString.
	path := '/tmp/grail_app_namespace_' , System myUserProfile userId asString , '.py'.
	hadApps := (UserGlobals at: #'GrailApps' otherwise: nil) notNil.
	importlib ___grailUseApp___: nil
%

category: 'Grail-Setup'
method: AppNamespaceTestCase
tearDown
	| apps |
	importlib ___grailUseApp___: nil.
	apps := UserGlobals at: #'GrailApps' otherwise: nil.
	apps ifNotNil: [
		apps removeKey: appName ifAbsent: [].
		(hadApps not and: [apps isEmpty]) ifTrue: [UserGlobals removeKey: #'GrailApps' ifAbsent: []]].
	[GsFile removeServerFile: path] on: Error do: [:e | ].
	(importlib @env1:modules) removeKey: #'grail_app_namespace' ifAbsent: [].
	self ___forgetCanonicalModule___: 'grail_app_namespace'
%

category: 'Grail-Tests'
method: AppNamespaceTestCase
testTheDefaultNamespaceIsUserGlobals
	"No app set: every registry is where it always was, the same object."
	self assert: importlib ___grailNamespace___ == UserGlobals.
	self assert: importlib ___grailCurrentAppName___ isNil.
	self assert: importlib ___canonicalClassRegistry___
		== (UserGlobals at: #'GrailCanonicalClasses').
	self assert: importlib ___canonicalModules___
		== (UserGlobals at: #'GrailCanonicalModules').
	self assert: importlib ___canonicalModuleHashes___
		== (UserGlobals at: #'GrailCanonicalModuleHashes')
%

category: 'Grail-Tests'
method: AppNamespaceTestCase
testAnAppHasItsOwnRegistries
	| defaultClasses defaultModules ns |
	defaultClasses := importlib ___canonicalClassRegistry___.
	defaultModules := importlib ___canonicalModules___.
	ns := importlib ___grailUseApp___: appName.
	self assert: importlib ___grailNamespace___ == ns.
	self deny: ns == UserGlobals.
	self assert: importlib ___grailCurrentAppName___ equals: appName.
	self deny: importlib ___canonicalClassRegistry___ == defaultClasses.
	self deny: importlib ___canonicalModules___ == defaultModules.
	self assert: importlib ___canonicalClassRegistry___ == (ns at: #'GrailCanonicalClasses')
		description: 'the app''s registry lives in the app''s namespace'.
	self assert: importlib ___canonicalClassRegistry___ isEmpty.
	"Back to the default: the very same objects as before."
	importlib ___grailUseApp___: nil.
	self assert: importlib ___canonicalClassRegistry___ == defaultClasses.
	self assert: importlib ___canonicalModules___ == defaultModules.
	"Joining the app again finds the same namespace, not a new one."
	self assert: (importlib ___grailUseApp___: appName) == ns
%

category: 'Grail-Tests'
method: AppNamespaceTestCase
testAModuleLoadedInAnAppIsRecordedThere
	"A load in an app records its module, hash and classes in the app's
	registries; the default namespace never hears of it.  (Cut 1 switches the
	registries only -- the module's backing class still goes into the shared
	PythonModules until cut 2.)"
	| f defaultClasses ns |
	defaultClasses := importlib ___canonicalClassRegistry___.
	self deny: (defaultClasses includesKey: 'grail_app_namespace.Widget').
	f := GsFile openWriteOnServer: path.
	f nextPutAll: 'class Widget:
    def __init__(self):
        self.size = 3
'.
	f close.
	ns := importlib ___grailUseApp___: appName.
	[importlib loadModuleFromPath: path name: 'grail_app_namespace'.
	self assert: (importlib ___canonicalClassRegistry___ includesKey: 'grail_app_namespace.Widget')
		description: 'the class is recorded in the app'.
	self assert: (importlib ___canonicalModuleHashes___ includesKey: 'grail_app_namespace')
		description: 'and the source hash'.
	self assert: (importlib ___canonicalModules___ includesKey: 'grail_app_namespace')
		description: 'and the module instance'.
	self ___forgetCanonicalModule___: 'grail_app_namespace'
	] ensure: [importlib ___grailUseApp___: nil].
	self deny: (importlib ___canonicalClassRegistry___ includesKey: 'grail_app_namespace.Widget')
		description: 'the default namespace never recorded it'.
	self deny: (importlib ___canonicalModuleHashes___ includesKey: 'grail_app_namespace')
%

category: 'Grail-Tests'
method: AppNamespaceTestCase
testEveryNamespaceIsVisited
	"What has to reach every namespace -- the reset an install's new runtime
	generation triggers -- sees the default and each app."
	| ns seen |
	ns := importlib ___grailUseApp___: appName.
	importlib ___grailUseApp___: nil.
	seen := IdentitySet new.
	importlib ___grailAllNamespacesDo___: [:each | seen add: each].
	self assert: (seen includes: UserGlobals).
	self assert: (seen includes: ns)
%
