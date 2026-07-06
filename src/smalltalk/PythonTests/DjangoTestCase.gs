! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for DjangoTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'DjangoTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
DjangoTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
DjangoTestCase removeAllMethods.
DjangoTestCase class removeAllMethods.
%

set compile_env: 0

! ===============================================================================
! DjangoTestCase
!
! Locks in Django 5.2 support: ``import django'', ``settings.configure'',
! ``django.setup()'', URL routing (including a ``<name>'' path converter),
! and the full WSGI request path (``application(environ, start_response)''),
! producing HttpResponse / JsonResponse bodies.  The fixture
! ``tests/python/pkg_scaffolding/use_django.py'' configures Django once and
! drives one request per helper.  See docs/Support_Django.md.
!
! Django is a heavy import (asgiref + the ORM + template engine all load on
! the ``django.setup()'' path); the fixture is imported ONCE and cached, as
! FlaskScaffoldingTestCase does, so re-running the suite does not refill the
! gem's transient code space (doits_meths) and OOM.
! ===============================================================================

category: 'Grail-Helpers'
method: DjangoTestCase
loadDjangoFixture
	"Load tests/python/pkg_scaffolding/use_django.py once per suite run
	and return the cached module instance.  django.setup() is
	process-global and runs on first import; the fixture guards it with
	``if not settings.configured''."

	| mods fullName cached |
	fullName := 'pkg_scaffolding.use_django'.
	mods := importlib @env1:modules.
	cached := mods @env0:at: fullName @env0:asSymbol ifAbsent: [nil].
	cached @env0:notNil ifTrue: [^ cached].
	(mods @env0:includesKey: #'pkg_scaffolding') ifFalse: [
		importlib
			loadModuleFromPath: (importlib grailDir , '/tests/python/pkg_scaffolding/__init__.py')
			name: 'pkg_scaffolding'
	].
	^ importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/pkg_scaffolding/use_django.py')
		name: fullName
%

category: 'Grail-Tests - django'
method: DjangoTestCase
testDjangoVersion
	"``import django; django.get_version()'' returns the vendored 5.2.x
	version string — confirms the package imports and its version
	machinery (django.utils.version, sys.version_info gating) runs."

	| mod version |
	mod := self loadDjangoFixture.
	version := mod @env1:django_version.
	self assert: (version @env0:indexOfSubCollection: '5.2') @env0:> 0
%

category: 'Grail-Tests - django'
method: DjangoTestCase
testDjangoWsgiIndex
	"A GET ``/'' routes to the index view and returns 200 with the
	view's body through the full WSGI application entry point —
	settings.configure + django.setup() + URL resolution + the
	middleware chain + HttpResponse materialisation."

	| mod result |
	mod := self loadDjangoFixture.
	result := mod @env1:hello_index.
	self assert: ((result @env1:__getitem__: 0) @env0:indexOfSubCollection: '200') @env0:> 0.
	self assert: (result @env1:__getitem__: 1) equals: 'Hello from Django on Grail!'
%

category: 'Grail-Tests - django'
method: DjangoTestCase
testDjangoWsgiPathConverter
	"A GET ``/greet/World/'' exercises a ``<name>'' path converter: the
	captured segment is passed to the view as a keyword argument and
	echoed in the response.  Locks in both URL-pattern regex
	compilation (LocaleRegexDescriptor via the descriptor protocol) and
	keyword-argument view dispatch (the varargs forwarder)."

	| mod result |
	mod := self loadDjangoFixture.
	result := mod @env1:hello_greet.
	self assert: ((result @env1:__getitem__: 0) @env0:indexOfSubCollection: '200') @env0:> 0.
	self assert: (result @env1:__getitem__: 1) equals: 'Hello, World!'
%

category: 'Grail-Tests - django'
method: DjangoTestCase
testDjangoWsgiJsonResponse
	"A GET ``/info/'' returns a JsonResponse — confirms JSON
	serialisation and the JSON content path end to end."

	| mod result body |
	mod := self loadDjangoFixture.
	result := mod @env1:hello_info.
	self assert: ((result @env1:__getitem__: 0) @env0:indexOfSubCollection: '200') @env0:> 0.
	body := result @env1:__getitem__: 1.
	self assert: (body @env0:indexOfSubCollection: '"framework"') @env0:> 0.
	self assert: (body @env0:indexOfSubCollection: '"django"') @env0:> 0.
	self assert: (body @env0:indexOfSubCollection: '5.2') @env0:> 0
%

set compile_env: 0
