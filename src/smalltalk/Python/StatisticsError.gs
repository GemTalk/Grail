! ------------------- Superclass check
run
ValueError ifNil: [self error: 'ValueError is not defined. Check file ordering.'].
%

! ------- StatisticsError (used by statistics module)
expectvalue /Class
doit
ValueError subclass: 'StatisticsError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
StatisticsError category: 'Exceptions'
%
