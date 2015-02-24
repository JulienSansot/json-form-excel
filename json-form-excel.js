"use strict";

var JsonFormExcel = (function(){

	var $tabForm = $('#tab-form');
	var $jsonErrors = $('#json-errors');
	
	var _defaultJsObj = {};
	var _fromDropZone = false;
	var _metadataFilesAvailable = [];
	var _metadataSelected = null;
	var _upload = null;
	var _filesDao = null;
	var _filesTable = null;

	var _templateKeys = Page.json_template;

	var _jsObj;


	function init(){
		setDefaultJson();

		_JsonTab.init();
		_ExcelTab.init();
		_FormTab.init();

		$('a[data-toggle="tab"]').on('show.bs.tab', function(e){
			var target = $(e.target).attr('href');
			if(target == '#tab-form'){
				_FormTab.set(_jsObj);
			}
			else if(target == '#tab-excel'){
				_ExcelTab.set(_jsObj);
			}
			else if(target == '#tab-json'){
				_JsonTab.set(_jsObj);
			}
		});		

		_JsonTab.pushChangeCallback(function(jsObj){
			_jsObj = jsObj;
		});
		_ExcelTab.pushChangeCallback(function(jsObj){
			_jsObj = jsObj;
		});
		_FormTab.pushChangeCallback(function(jsObj){
			_jsObj = jsObj;
		});
	}


	function setDefaultJson(){
		_defaultJsObj = {};

		function setValue(obj, key, value){
			var indexDot = key.indexOf('.');

			if(indexDot == -1){
				obj[key] = value;
			}
			else{
				var key1 = key.substr(0, indexDot);
				var key2 = key.substr(indexDot+1);

				if(obj.hasOwnProperty(key1) == false){
					obj[key1] = {};
				}

				obj[key1][key2] = value;
			}
		}

		_.each(_templateKeys, function(k){
			if(k['default']){
				setValue(_defaultJsObj, k.name, k['default']);
			}
			else if (k.type == 'string' ) {
				setValue(_defaultJsObj, k.name, null);
			}
			else if (k.type == 'int' ) {
				setValue(_defaultJsObj, k.name, null);
			}
			else if (k.type == 'epoch' ) {
				setValue(_defaultJsObj, k.name, null);
			}
			else if (k.type == 'array' ) {
				setValue(_defaultJsObj, k.name, []);	
			}
			else {
				setValue(_defaultJsObj, k.name, null);
			}	
		});
	}


	function displayMetadata(jsObj){
		jsObj = jsObj || _.cloneDeep(_defaultJsObj);

		_JsonTab.set(jsObj);
		_ExcelTab.set(jsObj);
		_FormTab.set(jsObj);
	}


	/**
	*
	* Editing the json in the Excel tab
	*
	*/
	var _ExcelTab = (function(){
		var $textarea = $("#textarea-excel");
		var _onChangeCallbacks = [];

		function _init(){

			//init events
			if ($textarea[0].addEventListener) {
			  $textarea[0].addEventListener('input', function() {
			  	_onChange();
			  }, false);
			} else if ($textarea[0].attachEvent) {
			  $textarea[0].attachEvent('onpropertychange', function() {		  	
			  	_onChange();
			  });
			}
		}

		function _onChange(){
			var jsObj = _get();
			_.each(_onChangeCallbacks, function(cb){
				cb(jsObj);
			})
		}

		function _set(jsObj){

			var flatObj = {};

			_.each(jsObj, function(v, k){
				if(_.isPlainObject(v)){
					_.each(v, function(v2, k2){
						flatObj[k + '.' + k2] = v2;
					});
				}
				else{
					flatObj[k] = v;
				}
			});

			var keys = _.keys(flatObj);
			var values = _.map(flatObj, function(v){
				if(_.isArray(v)){
					return v.join(', ')			
				}
				else if(_.isObject(v)){
					return JSON.stringify(v);
				}
				else {
					return v;
				}
			});

			$textarea.val(keys.join('\t') + '\n' + values.join('\t'));
		}

		function _get(){
			var text = $textarea.val();
			var lines = text.split('\n');

			var keys = _.filter(lines[0].split('\t'), function(v){
				return v.trim() != '';
			})

			var values = [];

			if(lines.length > 1){
				values = lines[1].split('\t');
			}

			var obj = {};

			_.each(keys, function(k, i){
				var templateKey = _.find(_templateKeys, function(tk){
					return tk.name == k;
				}) || {};

				var value;

				if(values[i] === undefined && templateKey.type == 'array' ){
					value = [];
				}
				else if(templateKey.type == 'int' || templateKey.type == 'epoch' ){
					value = parseInt(values[i], 10) || null;
				}
				else if(templateKey.type == 'object' ){
					try {
						value = JSON.parse(values[i]);
					}
					catch(e){
						value = templateKey['default'] || {};
					}
				}
				else{
					value = values[i];
				}


				var indexDot = k.indexOf('.');

				if(indexDot == -1){
					obj[k] = value;
				}
				else{
					var key1 = k.substr(0, indexDot);
					var key2 = k.substr(indexDot+1);

					if(obj.hasOwnProperty(key1) == false){
						obj[key1] = {};
					}

					obj[key1][key2] = value;
				}

			})

			return obj;
		}


		return {
			init: _init,
			set: _set,
			get: _get,
			pushChangeCallback: function(cb){
				_onChangeCallbacks.push(cb);
			}
		};
	})();


	/**
	*
	* Editing the metadata in the Json tab
	*
	*/
	var _JsonTab = (function(){

		var $textarea = $("#textarea-json");
		var _onChangeCallbacks = [];

		function _init(){

			//init events
			if ($textarea[0].addEventListener) {
			  $textarea[0].addEventListener('input', function() {
			  	_onChange();
			  }, false);
			} else if ($textarea[0].attachEvent) {
			  $textarea[0].attachEvent('onpropertychange', function() {		  	
			  	_onChange();
			  });
			}
		}

		function _onChange(){
			var jsObj = _get();
			if(jsObj != 'ERROR'){
				$('#msg-json-non-valid').css('visibility', 'hidden');
				_.each(_onChangeCallbacks, function(cb){				
					cb(jsObj);
				});
			}else{
				$('#msg-json-non-valid').css('visibility', 'visible');
			}
		}

		function _set(jsObj){
			$textarea.val(JSON.stringify(jsObj, null, 4));
			$('#msg-json-non-valid').css('visibility', 'hidden');
		}

		function _get(){
	    	var json = $textarea.val();

	    	var result = 'ERROR';
	    	try{
	    		result = JSON.parse(json);
	    	}
	    	catch(e){

	    		if(console) console.log(e);
	    	}

	    	return result;
		}

		return {
			init: _init,
			set: _set,
			get: _get,
			pushChangeCallback: function(cb){
				_onChangeCallbacks.push(cb);
			}
		};
	})();



	/**
	*
	* Editing the metadata in the Form tab
	*
	*/
	var _FormTab = (function(){

		var $form = $('#tab-form');
		var _onChangeCallbacks = [];
		var _jsObj = {};
		var _datePickerFormatDate = 'DD/MM/YYYY';
		var _datePickerFormatEpoch = 'DD/MM/YYYY HH:mm';

		function _init(){

			var keys = [];

			_.forIn(_templateKeys, function(v,k){
				keys.push(k);
			});

			_initForm();

			$(document).on("input", '#tab-form input', function(e) {
				var type = $(this).data('type');
				if(type != 'epoch' && type != 'date' && type != 'time'){
					_onChange($(this).data('key'), this.value);
				}
			});
			$(document).on("change", '#tab-form select', function(e) {
				_onChange($(this).data('key'), this.value);
			});

		};


		function _onChange(key, value){

			var templateKey = _.find(_templateKeys, function(tk){
				return tk.name == key;
			}) || {};

			if(templateKey.type == 'array') {
				value = _.map(value.split(','), function(v){
					return v.trim();
				});
			}
			else if(templateKey.type == 'int'){
				value = parseInt(value, 10) || null;
			}
			else if(templateKey.type == 'object'){
				try {
					value = JSON.parse(value);
				}
				catch(e){
					value = templateKey['default'] || {};
				}
			}

			if(value == '')
				value = null;

			var indexDot = key.indexOf('.');

			if(indexDot == -1){
				_jsObj[key] = value;
			}
			else{
				var key1 = key.substr(0, indexDot);
				var key2 = key.substr(indexDot+1);

				if(_jsObj.hasOwnProperty(key1) == false){
					_jsObj[key1] = {};
				}

				if(value == null){
					_jsObj[key1][key2] = undefined;
				} else{
					_jsObj[key1][key2] = value;
				}
			}


			_.each(_onChangeCallbacks, function(cb){				
				cb(_jsObj);
			});
		}


		function _initForm(){

			var nbColumns = 3;

			// var arraysKeys = Orange.splitArray(_templateKeys, 2);
			var arraysKeys = _.chunk(_templateKeys, Math.ceil(_templateKeys.length / nbColumns));

			var html = '<br><div class="row">';

			_.each(arraysKeys, function(keys){
				html += '<div class="col-lg-' + (12 / nbColumns) + '">';
				html += '<form class="form-horizontal"  autocomplete="off">';
				_.each(keys, function(k){
					html += '<div class="form-group" >';
					html += ' <label for="metadata-input-' + k.name + '" class="col-sm-6 control-label">';
					html += k.name.replace('.', '<br>.') + '</label>';
					html += ' <div class="col-sm-6">';

					if(k.options && k.options.length > 0){
						html += '  <select class="form-control" data-key="' + k.name + '" id="metadata-input-' + k.name + '">';
						html += '<option value=""></option>';
						_.each(k.options, function(o){
							html += '<option value="' + o + '">' + o + '</option>';
						});
						html += '  </select>';

					}
					else if(k.type == 'epoch' || k.type == 'date' || k.type == 'time') {
						html += '<div class="input-group">';

						var title = '';
						if(k.type == 'epoch'){
							title = 'title="Epoch time: null"';
						}

						html += '	<input type="text" data-type="' + k.type + '" class="form-control metadata-timepicker" data-key="' + k.name + '" id="metadata-input-' + k.name + '" ' + title + ' data-placement="top">';
						html += '	<span class="input-group-addon">';
						if(k.type == 'epoch' || k.type == 'time'){
							html += '		<i class="fa fa-clock-o bigger-110"></i>';
						}
						else{
							html += '		<i class="fa fa-calendar bigger-110"></i>';
						}
						html += '	</span>';					
						html += '</div>';
						// html += '<span class="help-block">UTC: 01/28/2015 11:45 AM</span>';
					}
					else{
						html += '  <input type="text" class="form-control" data-key="' + k.name + '" id="metadata-input-' + k.name + '">';
					}
					html += ' </div>';
					html += '</div>';
				});
				html += '</form>';
				html += '</div>';
			})

			html += '</div>';

			$tabForm.html(html);

			$('.metadata-timepicker').each(function(){

				var format = _datePickerFormatDate;

				if($(this).data('type') == 'epoch' || $(this).data('type') == 'time'  ){
					format = _datePickerFormatEpoch;
				}

				if($(this).data('type') == 'epoch'){
					$(this).tooltip({container:'body'});
				}


				var key = $(this).data('key');
				$(this).datetimepicker({
					format: format,
					useCurrent: false,
					showClear: true,
					showTodayButton: true,
					defaultDate: moment(moment().format('DD/MM/YYYY'), 'DD/MM/YYYY')
				});
				// .next().on(ace.click_event, function(){
				// 	$(this).prev().focus();
				// });


		        $(this).on("dp.change", function(e) {
		        	var type = $(this).data('type');
		        	var key = $(this).data('key');
		        	var date = $(this).data("DateTimePicker").date();
		        	var value = null;
		        	if(date != null){
						if(type == 'epoch'){
		        			value = date.unix();
						}
						else{
		        			value = date.format();
						}
		        	}
		        	_onChange(key, value);

					if(type == 'epoch'){
			        	$(this).attr('title', 'Epoch time: ' + value)
			        	.tooltip('fixTitle')
			        	.tooltip('hide');
					}
		        });
			});
		}


		function _set(jsObj) {
			_jsObj = jsObj;

			$form.find('input, select').val(''); //reset everything

			var inputs = {};

			_.each(jsObj, function(v, k){
				if(_.isPlainObject(v)){
					_.each(v, function(v2, k2){
						inputs[k + '.' + k2] = v2;
					});
				}
				else{
					inputs[k] = v;
				}
			})


			_.each(inputs, function(v, k){
				var templateKey = _.find(_templateKeys, function(tk){
					return tk.name == k;
				}) || {};

				var $input = $form.find('[data-key="' + k + '"]');

				if(templateKey.type == 'date' || templateKey.type == 'epoch' || templateKey.type == 'time'){

					var date;
					if(templateKey.type == 'epoch'){
						var date = moment(v, 'X');
					}
					else{
						var date = moment(v);
					}

					if(date.isValid()){
						$input.data("DateTimePicker").date(date);
					}
					else{
						$input.data("DateTimePicker").date(null);
					}
				}
				else if(_.isArray(v)){
					$input.val(v.join(', '));
				}
				else if(_.isObject(v)){
					$input.val(JSON.stringify(v));
				}
				else{
					$input.val(v);
				}

			})
		}


		return {
			init: _init,
			set: _set,
			pushChangeCallback: function(cb){
				_onChangeCallbacks.push(cb);
			}
		};

	})();

	init();

	return {
		set: function(jsObj){
			displayMetadata(jsObj);
		}
	}

})();