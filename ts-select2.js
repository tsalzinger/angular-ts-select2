/**!
 * MIT License
 * Copyright (c) 2015 Thomas Scheinecker
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
 * documentation files (the "Software"), to deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the
 * Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE
 * WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
 * OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
/**
 * @ngdoc directive
 * @name tsSelect2
 * @element select
 *
 * @param {expression} [tsSelect2] the config object used for initializing select2
 *
 * @description
 * A wrapper directive for select2 version 4
 */
(function (angular) {
    var TS_SELECT2_DEFAULTS = {
        // copy all classes on the original element upon initialization
        containerCssClass: function (element) {
            return element.attr('class');
        }
    };

    function tsSelect2Directive($http, $q, $animate) {
        var PRISTINE_CLASS = 'ng-pristine';
        var DIRTY_CLASS = 'ng-dirty';
        var TOUCHED_CLASS = 'ng-touched';
        var UNTOUCHED_CLASS = 'ng-untouched';
        var VALID_CLASS = 'ng-valid';
        var INVALID_CLASS = 'ng-invalid';

        // we override the default transport function to use the $http service instead of $.ajax
        function tsSelect2DirectiveTransport(params, success, failure) {
            var timeout = $q.defer();

            angular.extend({timeout: timeout}, params);
            $http(params).then(function(response) {
                success(response.data);
            }, failure);

            return {abort: timeout.resolve};
        }

        function tsSelect2DirectiveLink(scope, element, attrs, ngModelCtrl) {
            var select2Options = {};
            angular.extend(select2Options, TS_SELECT2_DEFAULTS);
            angular.extend(select2Options, scope.options);

            element.hide();

            /**
             * Adds a seleted option element for the given value to the dom
             * @param {*} value the value used for rendering the option element
             */
            // todo use format functions / sub directives
            function appendOption(value) {
                if (angular.isObject(value)) {
                    element.append('<option value="' + value.id + '" selected>' + value.text + '</option>');
                } else {
                    element.append('<option value="' + value + '" selected>' + value + '</option>');
                }
            }

            function initInitialSelectionOptions() {
                var $modelValue = ngModelCtrl.$modelValue;
                if (angular.isArray($modelValue)) {
                    angular.forEach($modelValue, appendOption);
                } else {
                    appendOption($modelValue);
                }
            }

            /**
             * Links into the ngModel controller and correctly sets the classes to the provided element
             * @param element the dom element to apply the css class changes to
             */
            function propagateCssStateChanges(element) {
                function handleChange(property, addClass, removeClass) {
                    var original = ngModelCtrl[property];
                    ngModelCtrl[property] = function() {
                        original();
                        $animate.setClass(element, addClass, removeClass);
                    }
                }

                handleChange('$setDirty', DIRTY_CLASS, PRISTINE_CLASS);
                handleChange('$setPristine', PRISTINE_CLASS, DIRTY_CLASS);

                handleChange('$setValid', VALID_CLASS, INVALID_CLASS);
                handleChange('$setInvalid', INVALID_CLASS, VALID_CLASS);

                handleChange('$setTouched', TOUCHED_CLASS, UNTOUCHED_CLASS);
                handleChange('$setUntouched', UNTOUCHED_CLASS, TOUCHED_CLASS);
            }

            /**
             * Provides the input element used for filtering the select2 options
             * @returns {*} the dom element used by select2 for allowing user input
             */
            function getInput() {
                return element.data().select2.dropdown.$search || element.data().select2.selection.$search;
            }

            function initSelect2() {
                if (!!select2Options.ajax && !select2Options.ajax.transport) {
                    select2Options.ajax.transport = tsSelect2DirectiveTransport;
                }

                if (!attrs.ngOptions && !!select2Options.ajax) {
                    initInitialSelectionOptions();

                    ngModelCtrl.$parsers.push(function (id) {
                        if (angular.isArray(id)) {
                            var values = [];
                            var idx = 0;
                            angular.forEach(id, function (singleId) {
                                values.push(
                                    singleId && {
                                        id: singleId,
                                        text: element.select2('data')[idx++].text
                                    });
                            });
                            return values;
                        }

                        return id && {
                                id: id,
                                text: element.select2('data')[0].text
                            };
                    });

                    ngModelCtrl.$parsers.push(function (id) {
                        return id === null ? undefined : id;
                    });
                }

                element.select2(select2Options);
                var selection = element.data().select2.$selection;
                propagateCssStateChanges(selection);

                getInput().on('blur.select2', function() {
                    element.trigger('blur');
                });
            }

            // defer initialization to execute after select and ngOptions initialization
            // we don't need to use $window as this is a visual change only - nothing changes in regard to angular
            // we could also just trigger a 'change' event on the element but this would result in
            // the control getting marked as dirty by angular
            // TODO - is there a better way to defer until the ngModel / ngOptions is initialized?
            window.setTimeout(initSelect2);

            // destroy the select2 on scope destruction
            scope.$on('$destroy', function () {
                getInput().off('.select2');
                element.select2('destroy');
            });
        }
        
        return {
            restrict: 'A',
            require: '^ngModel',
            priority: 1,
            scope: {
                options: '=?tsSelect2'
            },
            link: tsSelect2DirectiveLink
        }
    }

    angular.module('tsSelect2', [])
        .constant('TS_SELECT2_DEFAULTS', TS_SELECT2_DEFAULTS)
        .directive('tsSelect2', ['$http', '$q', '$animate', tsSelect2Directive]);

})(angular);