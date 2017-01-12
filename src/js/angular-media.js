/// <reference path="E:/var/Dropbox/projects/buzzvid/public/static/bower_components/minute/_all.d.ts" />
var App;
(function (App) {
    var AngularMedia = (function () {
        function AngularMedia() {
            this.$get = function ($rootScope, $q, $http, $timeout, $ui, $search, $preview) {
                var service = {};
                service.popup = function (query, args) {
                    if (query === void 0) { query = 'keyword'; }
                    if (args === void 0) { args = { tabs: ['images', 'videos', 'upload',], multiple: true, autoSearch: true, proxy: true, withMetadata: true }; }
                    var deferred = $q.defer();
                    var resolve = function (results) { return deferred.resolve(results); };
                    var data = { args: args, resolve: resolve, term: query, sources: {}, license: {}, uploads: [], metadata: {}, uploading: false };
                    var watch = function () { return 1; };
                    var ctrl = {
                        resolve: function (urls) {
                            $ui.closeLastPopup();
                            if (args.withMetadata) {
                                var results = [];
                                angular.forEach(angular.isArray(urls) ? urls : [urls], function (url) {
                                    results.push(angular.extend({ title: ctrl.baseName(url) }, data.metadata[url], { src: url }));
                                });
                                deferred.resolve(!args.multiple ? results[0] : results);
                            }
                            else {
                                deferred.resolve(urls);
                            }
                        },
                        submit: function () {
                            var sel = ctrl.getSelected();
                            if (!args.proxy) {
                                ctrl.resolve(sel);
                            }
                            else {
                                var promises = [];
                                var urls = [];
                                data.uploading = true;
                                angular.forEach(angular.isArray(sel) ? sel : [sel], function (url) {
                                    var req = $q.defer();
                                    promises.push(req.promise);
                                    $http.post('/generic/proxy', { url: url }).then(function (result) {
                                        var upload = result.data.url;
                                        if (upload) {
                                            urls.push(upload);
                                            data.metadata[upload] = data.metadata[url];
                                        }
                                        else {
                                            $ui.toast('Could not save ' + ctrl.baseName(url), 'error');
                                        }
                                        req.resolve();
                                    }, function (error) { return req.resolve(); });
                                });
                                $q.all(promises).then(function () { return ctrl.resolve(urls); });
                            }
                        },
                        search: function (type, term) {
                            if (!!term && /images|video/.test(type)) {
                                data.results = {};
                                data.searching = true;
                                var promise = $search[type === 'images' ? 'imageSearch' : 'youtubeSearch'](term, data.license[type] == 'creativeCommon');
                                promise.then(function (results) {
                                    data.results[type] = results;
                                    angular.forEach(results, function (result) { return data.metadata[result.src] = result; });
                                });
                                promise.finally(function () { return data.searching = false; });
                            }
                        },
                        abort: function () {
                            data.searching = false;
                        },
                        select: function (url) {
                            if (!args.multiple) {
                                data.source = url;
                            }
                            else {
                                data.sources[url] = !data.sources[url];
                            }
                        },
                        preview: function (type, url) {
                            if (type == 'images') {
                                $preview.lightbox([url]);
                            }
                            else {
                                window.open(url, '_blank');
                            }
                        },
                        upload: function (sources) {
                            if (!args.multiple) {
                                data.source = sources;
                                data.uploads = [sources];
                                data.metadata[sources] = { title: ctrl.baseName(sources) };
                            }
                            else {
                                angular.forEach(sources, function (src) {
                                    data.sources[src] = true;
                                    data.uploads.splice(0, 0, src);
                                    data.metadata[src] = { title: ctrl.baseName(src) };
                                });
                            }
                        },
                        getUploads: function () {
                            var results = [];
                            if (!args.multiple) {
                                if (data.uploads && data.source && data.uploads[0] === data.source) {
                                    results.push(data.source);
                                }
                            }
                            else {
                                angular.forEach(data.uploads, function (src) {
                                    if (data.sources[src]) {
                                        results.push(src);
                                    }
                                });
                            }
                            return results;
                        },
                        removeUpload: function (url) {
                            if (!args.multiple) {
                                data.source = null;
                            }
                            else {
                                data.sources[url] = false;
                            }
                        },
                        hasSource: function () {
                            if (!args.multiple) {
                                return !!data.source;
                            }
                            else {
                                var enabled = Minute.Utils.enabledKeys(data.sources);
                                return enabled && !!enabled.length;
                            }
                        },
                        getSelected: function () {
                            if (!args.multiple) {
                                return data.source;
                            }
                            else {
                                return Minute.Utils.enabledKeys(data.sources);
                            }
                        },
                        isSelected: function (url) {
                            var sel = ctrl.getSelected();
                            return !args.multiple ? sel === url : sel.indexOf(url) !== -1;
                        },
                        getType: function (url) {
                            return /\.(png|gif|jpg|jpeg)$/.test(url) ? 'image' : 'other';
                        },
                        baseName: function (url) {
                            return Minute.Utils.basename(url);
                        }
                    };
                    if (args.autoSearch) {
                        watch = $rootScope.$watch(function () { return data && data.tabs ? data.tabs.selectedTab : null; }, function (tab) { return ctrl.search(tab, data.term); });
                    }
                    $ui.popupUrl('/static/bower_components/angular-media/src/js/templates/media-popup.html', true, null, { ctrl: ctrl, data: data }).then(watch);
                    return deferred.promise;
                };
                service.init = function () {
                    return service;
                };
                return service.init();
            };
            this.$get.$inject = ['$rootScope', '$q', '$http', '$timeout', '$ui', '$search', '$preview'];
        }
        return AngularMedia;
    }());
    App.AngularMedia = AngularMedia;
    angular.module('AngularMedia', ['MinuteFramework', 'AngularSearch'])
        .provider("$media", AngularMedia);
})(App || (App = {}));
