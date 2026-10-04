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
! Cuts 1 and 2 of docs/App_Namespaces_Design.md.  Every name-keyed canonical
! registry accessor reads importlib class >> ___grailNamespace___, which is
! UserGlobals -- the default namespace, where the registries always lived --
! until an app is made current (___grailUseApp___:, the unchecked switch;
! ___grailSetApp___: is gemdb.set_app's checked one).  With no app set nothing
! changes.  With one set, a load chooses shared or app by its FILE: an app
! module's instance, hashes, classes and backing class go to the app, Grail's
! own sources to the shared base, and the app's module classes come first in
! the symbol list its code compiles against.  The cross-session half -- two
! apps each deploying a ``models'' and keeping their own code -- is
! tests/scripts/runAppNamespaceTest.gs, since it commits.
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
		apps removeKey: appName , '_b' ifAbsent: [].
		apps removeKey: appName , '_other' ifAbsent: [].
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
	registries, and files its backing class in the app's own module-class
	dictionary rather than PythonModules; the default namespace never hears of
	it."
	| f defaultClasses ns cls |
	defaultClasses := importlib ___canonicalClassRegistry___.
	self deny: (defaultClasses includesKey: 'grail_app_namespace.Widget').
	f := GsFile openWriteOnServer: path.
	f nextPutAll: 'class Widget:
    def __init__(self):
        self.size = 3
'.
	f close.
	ns := importlib ___grailUseApp___: appName.
	[cls := (importlib loadModuleFromPath: path name: 'grail_app_namespace') class.
	self assert: (importlib ___canonicalClassRegistry___ includesKey: 'grail_app_namespace.Widget')
		description: 'the class is recorded in the app'.
	self assert: (importlib ___canonicalModuleHashes___ includesKey: 'grail_app_namespace')
		description: 'and the source hash'.
	self assert: (importlib ___canonicalModules___ includesKey: 'grail_app_namespace')
		description: 'and the module instance'.
	self assert: ((ns at: #'GrailModuleClasses') at: #'grail_app_namespace' otherwise: nil) == cls
		description: 'the backing class is filed in the app'.
	self deny: (PythonModules at: #'grail_app_namespace' otherwise: nil) == cls
		description: 'and not in the shared PythonModules'.
	self ___forgetCanonicalModule___: 'grail_app_namespace'
	] ensure: [importlib ___grailUseApp___: nil].
	self deny: (importlib ___canonicalClassRegistry___ includesKey: 'grail_app_namespace.Widget')
		description: 'the default namespace never recorded it'.
	self deny: (importlib ___canonicalModuleHashes___ includesKey: 'grail_app_namespace')
%

category: 'Grail-Tests'
method: AppNamespaceTestCase
testTheFileDecidesSharedOrApp
	"Grail's own sources -- under grailDir/src/python/ -- belong to the shared
	base whatever app is set; anything else belongs to the app.  With no app
	set, everything is the default namespace."
	| stdlib ns |
	stdlib := importlib grailDir , '/src/python/stdlib/graphlib.py'.
	self assert: (importlib ___grailNamespaceForLoadOf___: 'graphlib' path: stdlib) == UserGlobals.
	self assert: (importlib ___grailNamespaceForLoadOf___: 'mine' path: path) == UserGlobals.
	ns := importlib ___grailUseApp___: appName.
	self assert: (importlib ___grailNamespaceForLoadOf___: 'graphlib' path: stdlib) == UserGlobals
		description: 'the stdlib stays shared inside an app'.
	self assert: (importlib ___grailNamespaceForLoadOf___: 'mine' path: path) == ns
		description: 'an application file belongs to the app'.
	self assert: (importlib ___grailNamespaceForLoadOf___: 'site' path: '/venv/lib/python3.14/site-packages/six.py') == ns
		description: 'and so does a venv''s package'
%

category: 'Grail-Tests'
method: AppNamespaceTestCase
testTwoAppsEachKeepTheirOwnModule
	"The §2.2 scenario inverted: two apps each import a module of the same name
	from their own file.  Neither is refused, each gets its own backing class
	and classes, and the first app's code still runs its own methods after the
	second loads."
	| pathB nsA nsB modA modB thingA thingB |
	pathB := path , '.b.py'.
	self ___writeWho: 'A' to: path.
	self ___writeWho: 'B' to: pathB.
	[nsA := importlib ___grailUseApp___: appName.
	modA := importlib loadModuleFromPath: path name: 'grail_app_namespace'.
	thingA := modA @env0:dynamicInstVarAt: #'Thing'.
	nsB := importlib ___grailUseApp___: appName , '_b'.
	modB := importlib loadModuleFromPath: pathB name: 'grail_app_namespace'.
	thingB := modB @env0:dynamicInstVarAt: #'Thing'.
	self deny: nsA == nsB.
	self deny: modA class == modB class description: 'one backing class per app'.
	self deny: thingA == thingB description: 'and one Thing per app'.
	self assert: (modA @env1:check) = 'A' description: 'app A still runs its own code'.
	self assert: (modB @env1:check) = 'B'.
	self assert: ((nsA at: #'GrailCanonicalClasses') at: 'grail_app_namespace.Thing') == thingA.
	self assert: ((nsB at: #'GrailCanonicalClasses') at: 'grail_app_namespace.Thing') == thingB.
	self ___forgetCanonicalModule___: 'grail_app_namespace'.
	importlib ___grailUseApp___: appName.
	self ___forgetCanonicalModule___: 'grail_app_namespace'
	] ensure: [
		importlib ___grailUseApp___: nil.
		(UserGlobals at: #'GrailApps' otherwise: nil) ifNotNil: [:apps |
			apps removeKey: appName , '_b' ifAbsent: []].
		[GsFile removeServerFile: pathB] on: Error do: [:e | ]]
%

category: 'Grail-Tests'
method: AppNamespaceTestCase
testSetAppIsChosenOncePerSession
	"gemdb.set_app refuses a second, different app, and refuses once a module
	that would belong to an app is already imported -- naming it -- since that
	module was loaded outside the app.  Setting the current app again is
	allowed."
	| caught |
	self ___writeWho: 'A' to: path.
	importlib loadModuleFromPath: path name: 'grail_app_namespace'.
	caught := [importlib ___grailSetApp___: appName. nil]
		on: RuntimeError do: [:ex | ex].
	self deny: caught isNil description: 'an application module was already imported'.
	self assert: (caught messageText includesString: 'grail_app_namespace').
	self assert: importlib ___grailCurrentAppName___ isNil.
	importlib ___grailUseApp___: appName.
	self assert: (importlib ___grailSetApp___: appName) == importlib ___grailNamespace___
		description: 'the same app again is a no-op'.
	caught := [importlib ___grailSetApp___: appName , '_other'. nil]
		on: RuntimeError do: [:ex | ex].
	self deny: caught isNil description: 'a different app is refused'.
	self assert: importlib ___grailCurrentAppName___ equals: appName
%

category: 'Grail-Tests'
method: AppNamespaceTestCase
testTheCompileListPutsTheAppFirst
	"While an app's code compiles, the app's module classes come before the
	shared PythonModules, so its code binds the app's module of a name first;
	shared code compiles with no app dictionary at all."
	| ns sl d |
	self deny: ((importlib ___grailCompileSymbolList___) asArray anySatisfy: [:each |
		each name == #'GrailModuleClasses']).
	ns := importlib ___grailUseApp___: appName.
	d := importlib ___grailModuleClassesIn___: ns create: true.
	sl := importlib ___grailCompileSymbolList___ asArray.
	self assert: (sl includesIdentical: d).
	self assert: (sl indexOf: d) < (sl indexOf: PythonModules).
	importlib ___grailInNamespace___: UserGlobals do: [
		self deny: (importlib ___grailCompileSymbolList___ asArray includesIdentical: d)
			description: 'a shared module compiles without the app''s classes']
%

category: 'Grail-Tests'
method: AppNamespaceTestCase
testMainIsCanonicalOnlyInAnApp
	"Outside an app __main__ is session-local (#851); in an app it is the app's
	canonical top file, whose committed instance is the app's globals."
	self assert: (importlib ___isSessionLocalModule___: '__main__').
	importlib ___grailUseApp___: appName.
	self deny: (importlib ___isSessionLocalModule___: '__main__').
	importlib ___grailUseApp___: nil.
	self assert: (importlib ___isSessionLocalModule___: '__main__')
%

category: 'Grail-Tests'
method: AppNamespaceTestCase
testATransientGlobalLivesInTheSession
	"``__transient__'' names are kept per session, beside -- not in -- the
	module's own storage, and read, write, list and delete like any global."
	| f mod |
	f := GsFile openWriteOnServer: path.
	f nextPutAll: '__transient__ = ["sock"]
sock = 1
kept = 2

def get():
    return sock

def drop():
    global sock
    del sock
'.
	f close.
	mod := importlib loadModuleFromPath: path name: 'grail_app_namespace'.
	self assert: (mod class includesSelector: #'dynamicInstVarAt:put:' environmentId: 0).
	self assert: (mod ___transientGlobals___ at: #'sock' otherwise: nil) = 1
		description: 'the value is in the session store'.
	self deny: ((mod _instvarNamesAfter: mod namedSize) includes: #'sock')
		description: 'and not in the module''s own storage'.
	self assert: ((mod _instvarNamesAfter: mod namedSize) includes: #'kept').
	self deny: ((mod _instvarNamesAfter: mod namedSize) includes: #'__transient__')
		description: 'the declaration is session state too'.
	self assert: (mod @env1:get) = 1 description: 'a function reads it'.
	self assert: (mod dynamicInstanceVariables includes: #'sock') description: 'globals() lists it'.
	mod @env1:drop.
	self assert: (mod ___transientGlobals___ at: #'sock' otherwise: nil) isNil
		description: 'del removes it'
%

category: 'Grail-Tests'
method: AppNamespaceTestCase
testAModuleWithoutTransientsKeepsTheKernelAccessors
	"Only a module that declares __transient__ pays for it."
	| f mod |
	f := GsFile openWriteOnServer: path.
	f nextPutAll: 'kept = 2
'.
	f close.
	mod := importlib loadModuleFromPath: path name: 'grail_app_namespace'.
	self deny: (mod class includesSelector: #'dynamicInstVarAt:' environmentId: 0).
	self deny: (mod class includesSelector: #'dynamicInstVarAt:put:' environmentId: 0)
%

category: 'Grail-Tests'
method: AppNamespaceTestCase
testOnlyEqualImmutableValuesStandForEachOther
	"A module-global store is skipped when the global already holds the same
	object or an equal immutable value Python cannot tell from it (module >>
	dynamicInstVarAt:put:)."
	| m tup |
	m := module @env0:new.
	tup := (Python at: #tuple) withAll: #(1 2).
	self assert: (m ___isSameImmutable___: 'abc' copy as: 'abc' copy).
	self assert: (m ___isSameImmutable___: tup as: ((Python at: #tuple) withAll: #(1 2))).
	self assert: (m ___isSameImmutable___: (2 raisedTo: 100) as: (2 raisedTo: 100)).
	self deny: (m ___isSameImmutable___: tup as: ((Python at: #tuple) withAll: #(1 3))).
	self deny: (m ___isSameImmutable___: 1 as: 1.0) description: 'equal is not the same value'.
	self deny: (m ___isSameImmutable___: 0.0 as: -0.0) description: 'floats only by identity'.
	self deny: (m ___isSameImmutable___: (OrderedCollection with: 1) as: (OrderedCollection with: 1))
		description: 'a list is mutable'.
	self deny: (m ___isSameImmutable___: #(1 2) copy as: #(1 2) copy)
		description: 'an Array that is not a tuple'
%

category: 'Grail-Support'
method: AppNamespaceTestCase
___writeWho: aString to: aPath
	| f |
	f := GsFile openWriteOnServer: aPath.
	f nextPutAll: 'class Thing:
    def who(self):
        return ''' , aString , '''

def check():
    return Thing().who()
'.
	f close
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
