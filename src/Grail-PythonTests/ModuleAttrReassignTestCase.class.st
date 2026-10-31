"
Issues #1953 and #1954: a Python assignment to a data attribute of a module
written in Smalltalk has to be what SMALLTALK reads back through the module's
accessor too.

These modules keep their data attributes as dictionary entries behind one-line
accessors (``math >> pi  ^ self @env0:at: #pi''), while a Python ``m.x = v''
stores a dynamic instVar that shadows the entry.  Python's read probes the
instVar first, so Python always agreed with itself.  Smalltalk did not, two ways:

  * the accessor read the entry alone, so it answered the value Python had
    replaced (#1953, the defect #1933 fixed for sys's accessors);
  * assigning a FUNCTION installed a monkey-patch dispatcher over the accessor,
    as if it were a module function, so the accessor CALLED the function with no
    arguments and answered its result -- ``sys.excepthook = hook'' made
    ``sys excepthook'' answer None (#1954).

So every accessor is checked with both shapes of value.  The fixture is
tests/python/module_attr_reassign.py, whose rows are the Python-visible half.
setUp snapshots BOTH of each module's stores for every attribute named below,
before the fixture runs, and tearDown puts them back, so a failing run leaves
the session as it found it.
"
Class {
	#name : 'ModuleAttrReassignTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule',
		'saved'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Fixtures' }
ModuleAttrReassignTestCase class >> accessors [
	"{ Python module name. Smalltalk class name. { { attribute. accessor } ... } }
	for every one-line data accessor that reads a dictionary entry."

	^ {
		{ '_sre'. #'_sre'. #(#(#CODESIZE #CODESIZE) #(#MAGIC #MAGIC)
			#(#MAXGROUPS #MAXGROUPS) #(#MAXREPEAT #MAXREPEAT)) }.
		{ 'cmath'. #cmath. #(#(#e #e) #(#inf #inf) #(#infj #infj) #(#nan #nan)
			#(#nanj #nanj) #(#pi #pi) #(#tau #tau)) }.
		{ 'enum'. #enum. #(#(#Enum #Enum) #(#Flag #Flag) #(#IntEnum #IntEnum)
			#(#IntFlag #IntFlag) #(#KEEP #KEEP) #(#StrEnum #StrEnum)) }.
		{ 'fractions'. #fractions. #(#(#Fraction #Fraction)) }.
		{ 'hashlib'. #hashlib. #(#(#algorithms_available #algorithms_available)
			#(#algorithms_guaranteed #algorithms_guaranteed)) }.
		{ 'html'. #html. #(#(#entities #entities)) }.
		{ 'html.entities'. #html_entities. #(#(#codepoint2name #codepoint2name)
			#(#entitydefs #entitydefs) #(#html5 #html5)
			#(#name2codepoint #name2codepoint)) }.
		{ 'math'. #math. #(#(#e #e) #(#inf #inf) #(#nan #nan) #(#pi #pi)
			#(#tau #tau)) }.
		{ 'mimetypes'. #mimetypes. #(#(#common_types #common_types)
			#(#encodings_map #encodings_map) #(#inited #inited)
			#(#suffix_map #suffix_map) #(#types_map #types_map)) }.
		{ 'numbers'. #numbers. #(#(#Complex #Complex) #(#Integral #Integral)
			#(#Number #Number) #(#Rational #Rational) #(#Real #Real)) }.
		{ 'os'. #os. #(#(#'_walk_symlinks_as_files' #'___walkSymlinksAsFiles')
			#(#linesep #linesep) #(#path #path) #(#pathsep #pathsep) #(#sep #sep)) }.
		{ 'sys'. #sys. #(#(#'__breakpointhook__' #'__breakpointhook__')
			#(#'__displayhook__' #'__displayhook__') #(#'__excepthook__' #'__excepthook__')
			#(#'__unraisablehook__' #'__unraisablehook__') #(#api_version #api_version)
			#(#argv #argv) #(#audit #audit) #(#base_exec_prefix #base_exec_prefix)
			#(#base_prefix #base_prefix) #(#builtin_module_names #builtin_module_names)
			#(#byteorder #byteorder) #(#call_tracing #call_tracing)
			#(#copyright #copyright) #(#dont_write_bytecode #dont_write_bytecode)
			#(#excepthook #excepthook) #(#exec_prefix #exec_prefix)
			#(#executable #executable) #(#flags #flags) #(#float_info #float_info)
			#(#float_repr_style #float_repr_style) #(#getrefcount #getrefcount)
			#(#getsizeof #getsizeof) #(#hash_info #hash_info)
			#(#hexversion #hexversion) #(#implementation #implementation)
			#(#int_info #int_info)) }
	}

]

{ #category : 'Grail-Private' }
ModuleAttrReassignTestCase >> assertAccessorsOf: aModuleName [
	"Every accessor of aModuleName answers what Python assigned, for a plain
	object and for a function.  Collects every miss, so one run names them all."

	| row inst wrong |
	row := self class accessors detect: [:each | (each at: 1) = aModuleName].
	inst := self instanceOf: row.
	wrong := OrderedCollection new.
	(row at: 3) do: [:pair |
		#('object' 'function') do: [:kind |
			| new got |
			new := self assign: kind to: (pair at: 1) on: inst named: aModuleName.
			got := [inst perform: (pair at: 2) env: 1]
				on: Error, BaseException
				do: [:ex | ex return: 'raised ' , ex class name].
			self restore: (pair at: 1) on: inst.
			got == new ifFalse: [
				wrong add: (pair at: 1) asString , '/' , kind , ' answered '
					, ([got printString] on: Error do: [:ex | ex return: '?'])]]].
	self assert: wrong asArray equals: #()

]

{ #category : 'Grail-Private' }
ModuleAttrReassignTestCase >> assign: kind to: aSym on: inst named: aModuleName [
	"Store a fresh value of kind over aSym the way Python does, and answer it.

	By a real Python assignment when inst is the module ``import'' gives.  Two
	of the classes are not: ``fractions'' and ``html.entities'' import from
	their Python source (Pyfractions, Pyhtml_entities), and the Smalltalk
	classes' instances are reached only from Smalltalk (html's entities entry
	is html_entities instance).  Their accessors have the same pattern and the
	same defect, so the store is made through ___pyAttrStore___:put:, the entry
	point a Python assignment takes."

	| new |
	(self call: #module_named with: { aModuleName }) == inst ifTrue: [
		^ self call: #reassign with: { aModuleName. aSym asString. kind }].
	new := self call: #new_value with: { kind }.
	inst @env1:___pyAttrStore___: aSym asString put: new.
	^ new

]

{ #category : 'Grail-Private' }
ModuleAttrReassignTestCase >> call: aName with: args [
	^ (testModule @env1:___pyAttrLoad___: aName) @env1:value: args value: nil

]

{ #category : 'Grail-Private' }
ModuleAttrReassignTestCase >> instanceOf: aRow [
	^ (Python at: (aRow at: 2)) @env1:instance

]

{ #category : 'Grail-Private' }
ModuleAttrReassignTestCase >> restore: aSym on: inst [
	"Put the entry and the dynamic instVar back exactly as setUp found them,
	and clear any tombstone."

	| rec |
	rec := (saved at: inst) at: aSym.
	(rec at: 1) == nil
		ifTrue: [inst removeKey: aSym ifAbsent: []]
		ifFalse: [inst at: aSym put: (rec at: 1)].
	(rec at: 2) == nil
		ifTrue: [(inst dynamicInstVarAt: aSym) == nil
			ifFalse: [inst removeDynamicInstVar: aSym]]
		ifFalse: [inst dynamicInstVarAt: aSym put: (rec at: 2)].
	inst @env1:___unmarkGlobalDeleted___: aSym

]

{ #category : 'Grail-Setup' }
ModuleAttrReassignTestCase >> setUp [
	saved := IdentityKeyValueDictionary new.
	self class accessors do: [:row |
		| inst byName |
		inst := self instanceOf: row.
		byName := saved at: inst ifAbsentPut: [IdentityKeyValueDictionary new].
		(row at: 3) do: [:pair |
			byName at: (pair at: 1) put: {
				inst at: (pair at: 1) otherwise: nil.
				inst dynamicInstVarAt: (pair at: 1)}]].
	importlib @env1:modules removeKey: #'module_attr_reassign' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/module_attr_reassign.py')
		name: 'module_attr_reassign'

]

{ #category : 'Grail-Setup' }
ModuleAttrReassignTestCase >> tearDown [
	saved == nil ifFalse: [
		saved keysAndValuesDo: [:inst :byName |
			byName keysDo: [:sym | self restore: sym on: inst]]].
	super tearDown

]

{ #category : 'Grail-Tests' }
ModuleAttrReassignTestCase >> testCmathAccessors [
	self assertAccessorsOf: 'cmath'

]

{ #category : 'Grail-Tests' }
ModuleAttrReassignTestCase >> testEnumAccessors [
	self assertAccessorsOf: 'enum'

]

{ #category : 'Grail-Tests - Controls' }
ModuleAttrReassignTestCase >> testEveryCheckAgreesWithCPython [
	"The Python-visible half, which scripts/check_python_fixtures.sh checks
	against CPython.  It held before the fix too: Python always read back what
	it wrote."

	self
		assert: (testModule @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '12 checks, 0 disagreeing [], keys match: True'

]

{ #category : 'Grail-Tests' }
ModuleAttrReassignTestCase >> testFractionsAccessors [
	"The accessor's entry is #fractionClass, not #Fraction: Python's assignment
	shadows the NAME, so that is what the accessor has to look under first.
	See assign:to:on:named: for how the store is made."

	self assertAccessorsOf: 'fractions'

]

{ #category : 'Grail-Tests' }
ModuleAttrReassignTestCase >> testHashlibAccessors [
	self assertAccessorsOf: 'hashlib'

]

{ #category : 'Grail-Tests' }
ModuleAttrReassignTestCase >> testHtmlAccessors [
	self assertAccessorsOf: 'html'

]

{ #category : 'Grail-Tests' }
ModuleAttrReassignTestCase >> testHtmlEntitiesAccessors [
	self assertAccessorsOf: 'html.entities'

]

{ #category : 'Grail-Tests' }
ModuleAttrReassignTestCase >> testMathAccessors [
	self assertAccessorsOf: 'math'

]

{ #category : 'Grail-Tests' }
ModuleAttrReassignTestCase >> testMimetypesAccessors [
	"inited included: its accessor read the entry too, with a default."

	self assertAccessorsOf: 'mimetypes'

]

{ #category : 'Grail-Tests' }
ModuleAttrReassignTestCase >> testNumbersAccessors [
	self assertAccessorsOf: 'numbers'

]

{ #category : 'Grail-Tests' }
ModuleAttrReassignTestCase >> testOsAccessors [
	"_walk_symlinks_as_files is answered by ___walkSymlinksAsFiles."

	self assertAccessorsOf: 'os'

]

{ #category : 'Grail-Tests' }
ModuleAttrReassignTestCase >> testSreAccessors [
	self assertAccessorsOf: '_sre'

]

{ #category : 'Grail-Tests' }
ModuleAttrReassignTestCase >> testSysAccessors [
	"#1933 routed these through ___dataGlobalAt___:, so a plain value already
	read back; a FUNCTION still did not, because the store put a call dispatcher
	over the accessor (#1954)."

	self assertAccessorsOf: 'sys'

]
