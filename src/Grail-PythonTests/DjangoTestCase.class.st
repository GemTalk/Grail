Class {
	#name : 'DjangoTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
DjangoTestCase >> loadDjangoFixture [
	"Load tests/python/pkg_scaffolding/use_django.py once per suite run
	and return the cached module instance.  django.setup() is
	process-global and runs on first import; the fixture guards it with
	``if not settings.configured''."

	| mods fullName cached |
	fullName := 'pkg_scaffolding.use_django'.
	mods := importlib @env1:modules.
	cached := mods at: fullName asSymbol ifAbsent: [nil].
	cached notNil ifTrue: [^ cached].
	(mods includesKey: #'pkg_scaffolding') ifFalse: [
		importlib
			loadModuleFromPath: (importlib grailDir , '/tests/python/pkg_scaffolding/__init__.py')
			name: 'pkg_scaffolding'
	].
	^ importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/pkg_scaffolding/use_django.py')
		name: fullName

]

{ #category : 'Grail-Tests - django' }
DjangoTestCase >> testDjangoVersion [
	"``import django; django.get_version()'' returns the vendored 5.2.x
	version string — confirms the package imports and its version
	machinery (django.utils.version, sys.version_info gating) runs."

	| mod version |
	mod := self loadDjangoFixture.
	version := mod @env1:django_version.
	self assert: (version indexOfSubCollection: '5.2') > 0

]

{ #category : 'Grail-Tests - django' }
DjangoTestCase >> testDjangoWsgiIndex [
	"A GET ``/'' routes to the index view and returns 200 with the
	view's body through the full WSGI application entry point —
	settings.configure + django.setup() + URL resolution + the
	middleware chain + HttpResponse materialisation."

	| mod result |
	mod := self loadDjangoFixture.
	result := mod @env1:hello_index.
	self assert: ((result @env1:__getitem__: 0) indexOfSubCollection: '200') > 0.
	self assert: (result @env1:__getitem__: 1) equals: 'Hello from Django on Grail!'

]

{ #category : 'Grail-Tests - django' }
DjangoTestCase >> testDjangoWsgiJsonResponse [
	"A GET ``/info/'' returns a JsonResponse — confirms JSON
	serialisation and the JSON content path end to end."

	| mod result body |
	mod := self loadDjangoFixture.
	result := mod @env1:hello_info.
	self assert: ((result @env1:__getitem__: 0) indexOfSubCollection: '200') > 0.
	body := result @env1:__getitem__: 1.
	self assert: (body indexOfSubCollection: '"framework"') > 0.
	self assert: (body indexOfSubCollection: '"django"') > 0.
	self assert: (body indexOfSubCollection: '5.2') > 0

]

{ #category : 'Grail-Tests - django' }
DjangoTestCase >> testDjangoWsgiPathConverter [
	"A GET ``/greet/World/'' exercises a ``<name>'' path converter: the
	captured segment is passed to the view as a keyword argument and
	echoed in the response.  Locks in both URL-pattern regex
	compilation (LocaleRegexDescriptor via the descriptor protocol) and
	keyword-argument view dispatch (the varargs forwarder)."

	| mod result |
	mod := self loadDjangoFixture.
	result := mod @env1:hello_greet.
	self assert: ((result @env1:__getitem__: 0) indexOfSubCollection: '200') > 0.
	self assert: (result @env1:__getitem__: 1) equals: 'Hello, World!'

]
