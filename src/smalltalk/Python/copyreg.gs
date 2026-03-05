! ------------------- Superclass check
run
module ifNil: [self error: 'module is not defined. Check file ordering.'].
%

! ------- copyreg class (Python 'copyreg' module)
expectvalue /Class
doit
module subclass: 'copyreg'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
copyreg comment:
'Python copyreg module (stub).

Provides pickle/copy dispatch table registration.
See https://docs.python.org/3/library/copyreg.html
'
%

expectvalue /Class
doit
copyreg category: 'Modules'
%

expectvalue /Metaclass3
doit
copyreg removeAllMethods: 1.
copyreg class removeAllMethods: 1.
%

set compile_env: 1

category: 'Python-Accessors'
method: copyreg
dispatch_table
	^ self ___at___: #dispatch_table
%

category: 'Python-Accessors'
method: copyreg
pickle
	^ self ___at___: #pickle
%

category: 'Python-Initialization'
method: copyreg
initialize
	self
		initialize_dispatch_table;
		initialize_pickle;
		yourself
%

category: 'Python-Initialization'
method: copyreg
initialize_dispatch_table
	self ___at___: #dispatch_table put: (KeyValueDictionary perform: #new env: 0)
%

category: 'Python-Initialization'
method: copyreg
initialize_pickle
	"pickle(ob_type, pickle_function, constructor_ob=None)"
	self ___at___: #pickle put: [:positional :keywords |
		| obType pickleFunc |
		obType := positional ___at___: 1.
		pickleFunc := positional ___at___: 2.
		(self ___at___: #dispatch_table) perform: #at:put: env: 0 withArguments: { obType. pickleFunc }.
		nil
	]
%

set compile_env: 0
