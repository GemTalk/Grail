Class {
	#name : 'ImportlibReloadTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-Reload' }
ImportlibReloadTestCase >> cachedMethodsAmong: methods [
	"The keys of the session's method-keyed caches (BaseException
	___forgetMethodCaches___) that are one of methods, or a block of one."

	| found |
	found := IdentitySet new.
	#(#'GrailIpLineCache' #'GrailIpTbLineCache' #'GrailIpSpanCache'
	  #'GrailIRMethodCache' #'GrailMethodFileCache' #'___GrailReceiverNameCache___') do: [:k |
		(SessionTemps current at: k otherwise: KeyValueDictionary new) keysDo: [:key | | m |
			m := (key isKindOf: Array) ifTrue: [key first] ifFalse: [key].
			((m isKindOf: GsNMethod)
				and: [(methods includes: m) or: [methods includes: m homeMethod]])
					ifTrue: [found add: m]]].
	^ found

]

{ #category : 'Grail-Tests-Reload' }
ImportlibReloadTestCase >> loadFixture [
	importlib @env1:modules removeKey: #'use_reload' ifAbsent: [].
	^ importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/use_reload.py')
		name: 'use_reload'

]

{ #category : 'Grail-Tests-Reload' }
ImportlibReloadTestCase >> loadProbe: source [
	"Write the probe source, drop any cached copy, and load it fresh."

	self writeProbe: source.
	importlib @env1:modules removeKey: #'grail_reload_regression' ifAbsent: [].
	^ importlib loadModuleFromPath: self probePath name: 'grail_reload_regression'

]

{ #category : 'Grail-Tests-Reload' }
ImportlibReloadTestCase >> probePath [
	^ (self tmp: 'reload_regression.py')

]

{ #category : 'Grail-Tests-Reload' }
ImportlibReloadTestCase >> testModuleHasFile [
	"A loaded module carries __file__ pointing at its source path (CPython
	parity, and what reload needs to find the source)."

	| probe |
	probe := self loadProbe: 'X = 0
'.
	self assert: ((probe dynamicInstVarAt: #'__file__') endsWith: 'reload_regression.py')

]

{ #category : 'Grail-Tests-Reload' }
ImportlibReloadTestCase >> testReloadPreservesIdentity [
	"reload returns the SAME module object and leaves sys.modules pointing at
	it (so held references and the cache see the new code) — CPython semantics."

	| probe fixture result cached |
	probe := self loadProbe: 'VALUE = 1
'.
	fixture := self loadFixture.
	self writeProbe: 'VALUE = 2
'.
	result := fixture @env1:reload_mod: probe.
	self assert: result == probe.
	cached := importlib @env1:modules at: #'grail_reload_regression' ifAbsent: [nil].
	self assert: cached == probe.
	self assert: (fixture @env1:get_VALUE: probe) equals: 2

]

{ #category : 'Grail-Tests-Reload' }
ImportlibReloadTestCase >> testReloadRecompilesFunction [
	"importlib.reload recompiles a changed function body (the Flask view case)."

	| probe fixture |
	probe := self loadProbe: 'def greet():
    return "hi"
'.
	fixture := self loadFixture.
	self assert: (fixture @env1:call_greet: probe) equals: 'hi'.
	self writeProbe: 'def greet():
    return "bye"
'.
	fixture @env1:reload_mod: probe.
	self assert: (fixture @env1:call_greet: probe) equals: 'bye'

]

{ #category : 'Grail-Tests-Reload' }
ImportlibReloadTestCase >> testReloadReleasesReplacedMethodsFromCaches [
	"#1463: the traceback caches key on the METHOD object and hold it strongly,
	so after a reload every entry for a replaced method kept the old method
	alive -- and through it the module body's whole generated source.  A
	session reloading in a loop grew ~1 MB a reload and died.  The reload
	must leave none of the replaced methods in those caches."

	| probe fixture old |
	probe := self loadProbe: 'import traceback
def boom():
    try:
        1 / 0
    except ZeroDivisionError:
        return traceback.format_exc()
TB = boom()
'.
	fixture := self loadFixture.
	old := IdentitySet withAll: (probe class methodDictForEnv: 1) values.
	"Precondition: formatting the traceback cached some of this module's
	methods -- otherwise the check below passes vacuously."
	self deny: (self cachedMethodsAmong: old) isEmpty.
	fixture @env1:reload_mod: probe.
	self assert: (self cachedMethodsAmong: old) isEmpty

]

{ #category : 'Grail-Tests-Reload' }
ImportlibReloadTestCase >> testReloadReReadsSource [
	"importlib.reload picks up a changed module-level constant."

	| probe fixture |
	probe := self loadProbe: 'VALUE = "alpha"
'.
	fixture := self loadFixture.
	self assert: (fixture @env1:get_VALUE: probe) equals: 'alpha'.
	self writeProbe: 'VALUE = "beta"
'.
	fixture @env1:reload_mod: probe.
	self assert: (fixture @env1:get_VALUE: probe) equals: 'beta'

]

{ #category : 'Grail-Tests-Reload' }
ImportlibReloadTestCase >> testRunWithReloaderRebuildsApp [
	"The full dev-server reloader: run_with_reloader builds the app from a
	factory; after cycle 1 a v2 source is swapped into the watched file, so the
	reloader detects the change, reloads the module, and rebuilds with the new
	code.  Cycle 1 sees MARKER R1; cycle 2 sees R2 — and the server was bound
	each cycle."

	| lf appPath v2Path fixture result src1 src2 |
	lf := String with: Character lf.
	appPath := (self tmp: 'rl_app.py').
	v2Path := (self tmp: 'rl_app_v2.py').
	src1 := 'MARKER = "R1"', lf,
		'def create_app():', lf,
		'    def app(environ, start_response):', lf,
		'        return [b"ok"]', lf,
		'    return app', lf.
	src2 := 'MARKER = "R2"', lf,
		'def create_app():', lf,
		'    def app(environ, start_response):', lf,
		'        return [b"ok"]', lf,
		'    return app', lf.
	self writeFile: appPath contents: src1.
	"Write v2 a second later so its mtime differs (whole-second resolution);
	the os.rename in the fixture then moves a newer-mtime file into place."
	(Delay forMilliseconds: 1100) wait.
	self writeFile: v2Path contents: src2.
	importlib @env1:modules removeKey: #'grail_rl_app' ifAbsent: [].
	importlib loadModuleFromPath: appPath name: 'grail_rl_app'.
	fixture := self loadFixture.
	result := fixture @env1:run_reloader_cycle_test: appPath _: v2Path _: 'grail_rl_app'.
	self assert: result size equals: 2.
	self assert: ((result at: 1) at: 2) equals: 'R1'.
	self assert: ((result at: 2) at: 2) equals: 'R2'.
	self assert: ((result at: 1) at: 3)
		description: 'reloader did not bind a server in cycle 1'

]

{ #category : 'Grail-Tests-Reload' }
ImportlibReloadTestCase >> testStatReloaderDetectsChange [
	"werkzeug._reloader.StatReloader (the auto-reloader's file watcher) reports
	a watched module as changed once its source mtime moves — the trigger the
	dev server uses to decide when to reload."

	| probe fixture reloader |
	probe := self loadProbe: 'VALUE = 1
'.
	fixture := self loadFixture.
	reloader := fixture @env1:make_stat_reloader: self probePath _: 'grail_reload_regression'.
	self assert: (fixture @env1:reloader_changed: reloader) isEmpty
		description: 'StatReloader reported a change before any edit'.
	"mtime has whole-second resolution (GsFileStat), so wait past the next
	second boundary before rewriting to guarantee a detectable change."
	(Delay forMilliseconds: 1100) wait.
	self writeProbe: 'VALUE = 2
'.
	self assert: ((fixture @env1:reloader_changed: reloader) includes: 'grail_reload_regression')
		description: 'StatReloader did not detect the source change'

]

{ #category : 'Grail-Tests-Reload' }
ImportlibReloadTestCase >> writeFile: path contents: source [
	"Write source to path (overwriting); return the path."

	| f |
	f := GsFile openWriteOnServer: path.
	f nextPutAll: source.
	f close.
	^ path

]

{ #category : 'Grail-Tests-Reload' }
ImportlibReloadTestCase >> writeProbe: source [
	"Write the probe module source to its temp path; return the path."

	| f |
	f := GsFile openWriteOnServer: self probePath.
	f nextPutAll: source.
	f close.
	^ self probePath

]
