CC = cc
CXX = c++
CFLAGS = -Wall -Wconversion -Wno-sign-conversion -Wextra -fPIC -O2
UNAME_S := $(shell uname -s)
comma := ,

ifeq ($(UNAME_S),Darwin)
  SHARED_EXT = dylib
  SHARED_FLAGS = -dynamiclib
  RPATH_FLAGS = -Wl$(comma)-rpath$(comma)@executable_path
  UNDEF_ARGS = -undefined dynamic_lookup
else
  # Linux
  SHARED_EXT = so
  SHARED_FLAGS = -shared
  RPATH_FLAGS =
  UNDEF_ARGS =
endif

EXT_OBJECTS = _statisticsmodule.o _bisectmodule.o _crc32cmodule.o _shimtestmodule.o _heapqmodule.o _grail_demo.o _sre.o

LIB = libcpython_ua.$(SHARED_EXT)
OBJECTS = cpython.o $(EXT_OBJECTS)

all: $(LIB)

# cpython.cc implements the CPython C API + GCI User Actions (requires GEMSTONE)
# -Wno-strict-aliasing / -Wno-unused-function suppress warnings from $(GEMSTONE)/include/gci*.h{f,t}
cpython.o: cpython.cc cpython.h
	$(CXX) -Wall -Wextra -Wno-unused-parameter -Wno-strict-aliasing -Wno-unused-function -fPIC -O2 -I$(GEMSTONE)/include -c cpython.cc -o cpython.o

# Extension modules get -Wno-unused-parameter since we don't control their source
_statisticsmodule.o: _statisticsmodule.c cpython.h
	$(CC) $(CFLAGS) -Wno-unused-parameter -c _statisticsmodule.c

_bisectmodule.o: _bisectmodule.c cpython.h
	$(CC) $(CFLAGS) -c _bisectmodule.c

_crc32cmodule.o: _crc32cmodule.c cpython.h
	$(CC) $(CFLAGS) -c _crc32cmodule.c

_shimtestmodule.o: _shimtestmodule.c cpython.h
	$(CC) $(CFLAGS) -c _shimtestmodule.c

_heapqmodule.o: _heapqmodule.c cpython.h
	$(CC) $(CFLAGS) -Wno-unused-parameter -c _heapqmodule.c

_grail_demo.o: _grail_demo.c cpython.h
	$(CC) $(CFLAGS) -DGRAIL_SHIM -c _grail_demo.c

_sre.o: _sre/sre.c _sre/sre.h _sre/sre_lib.h _sre/sre_constants.h _sre/sre_targets.h cpython.h
	$(CC) $(CFLAGS) -DGRAIL_SHIM -Wno-unused-parameter -Wno-unused-function -Wno-unused-variable -Wno-missing-field-initializers -I. -c _sre/sre.c -o _sre.o

$(LIB): $(OBJECTS)
	$(CXX) $(SHARED_FLAGS) -o $@ $(OBJECTS) $(GEMSTONE)/lib/gciualib.o -lm -lpthread $(UNDEF_ARGS)

GRAIL_LIB_DIR = ../../../lib
PYTHON_INCLUDES = $(shell python3-config --includes 2>/dev/null)

dynmods: $(GRAIL_LIB_DIR)/_grail_demo.so

$(GRAIL_LIB_DIR)/_grail_demo.so: _grail_demo.c
	$(CC) $(CFLAGS) $(PYTHON_INCLUDES) $(SHARED_FLAGS) -o $@ _grail_demo.c $(UNDEF_ARGS)

clean:
	rm -f $(OBJECTS) $(LIB)

.PHONY: all clean dynmods
