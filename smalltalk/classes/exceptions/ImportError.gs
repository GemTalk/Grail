! ------------------- Superclass check
run
Exception ifNil: [self error: 'Exception is not defined. Check file ordering.'].
%

! ------- ImportError
expectvalue /Class
doit
Exception subclass: 'ImportError'
  instVarNames: #( name path msg )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
ImportError comment:
'Python ImportError exception.

Instance variables:
  name - name of the module that failed to import
  path - path to the module file
  msg - error message
'
%

expectvalue /Class
doit
ImportError category: 'Exceptions'
%
