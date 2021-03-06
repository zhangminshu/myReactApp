import React from 'react';
import { Layout, Menu, Table, Input, Icon, Button, message, Modal, Radio, Popover, Checkbox,Spin,Upload, Drawer } from 'antd';
import HTTP from '../../httpServer/axiosConfig.js'
import cookie from 'js-cookie';
import util from '../../lib/util.js';
import './style.less'
import copy from 'copy-to-clipboard';
import EmptyComp from '../../componment/emptyPage/index.jsx'
import coverPDF from '../../img/coverPDF.svg'
import coverAZW3 from '../../img/coverAZW3.svg'
import coverEPUB from '../../img/coverEPUB.svg'
import coverMOBI from '../../img/coverMOBI.svg'
import coverTXT from '../../img/coverTXT.svg'
import iconDownload from '../../img/icon_download.svg'
import iconFast from '../../img/icon_fast.svg'
const { confirm } = Modal;
const RadioGroup = Radio.Group;
const SUCCESS_CODE = 0;
const { Header, Footer, Sider, Content } = Layout;
//防抖方法
function debounce(fn, ms = 500) {
    let timeoutId
    return function () {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        fn.apply(this, arguments)
      }, ms)
    }
  }
class SearchResult extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            popoverVisible:'',
            popoverPcVisible:'',
            currBookUrl:'',
            showPoint:false,
            showTipModal:false,
            result:0,
            showEmpty:false,
            userStatus:"",
            isLoading:false,
            isAddTag:false,
            editTag:'',//编辑中的标签
            showTagDialog:false,
            categoryList:[],
            tagList:[],
            tipType:'single',//single为克隆；singleTip为标签
            editTagInfo:{
                addTag:'',
                newTag:''
            },
            selectBookId:"",//需要修改标签文件id
            tableSelectedRowKeys: [],
            selectedRow: [],
            showCheckBox: false,
            pageNum: 1,
            pageSize: 10,
            showTable: false,
            tableData: [],
            fileType: 0,
            selectedTag:[],//默认所在的标签
            searchBookName: '',
            searchText: '',
            totalNum: 0,
            tagList: [],
            searchType:'',
            newUserInfo: {
                email: '',
                nick_name: "",
                new_pwd: '',
                status: '',
                kindle_email: '',
                old_pwd: '',
                new_pwd: ''
            },
            showBottomTip:true//默认
        }
        this.isExternalLink = false;
        this.unLogin = false;
        this.changeThrottle = debounce(this.changeThrottle, 800)//调用设定好的防抖方法
    }
    componentDidMount() {
        document.title = '阅读链 - 搜索'
        this.input.focus()
        const urlParams = location.href.split("?")[1];
        const searchVal = sessionStorage.getItem('searchVal');
        this.isExternalLink = false;
        if(urlParams){
            const type = urlParams.split("=")[0];
            const searchType = urlParams.split("=")[1];
            if(type === 'search_text'){
                this.isExternalLink = true;
                const currSearchVal = searchType.split('&')[0]
                this.searchBook(decodeURIComponent(currSearchVal))
            }else if(type ==='type' && searchType === 'user'){
                this.setState({searchType})
            }
        }else if(searchVal){
            this.searchBook(searchVal)
        }
        const Authorization = cookie.get('Authorization')
        if(Authorization){
            this.unLogin = false;
            this.getTotal();
            this.getCategory();
            this.getDownloadCount();
        }else{
            this.unLogin = true;
        }
    }
    getDownloadCount=()=>{
        const url ='/book/_download_count';
        HTTP.get(url,{}).then((response)=>{
            const res = response.data;
            if(res.status === SUCCESS_CODE){
                if(res.data > 0){
                    this.setState({showPoint:true})
                }else{
                    this.setState({showPoint:false})
                }
            }
        })
    }
    getCategory = () => {
        const url = '/category';
        HTTP.get(url, {}).then(response => {
            const res = response.data;
            if (res.status === 0) {
                const tagList =[];
                const newList = tagList.concat(res.data.list);
                this.setState({
                    categoryList:res.data.list,
                    tagList: newList.reverse()
                })
            } else {
                message.error(res.error);
            }
        })
    }
    getTotal = () => {
        const url = "/book/_total";
        HTTP.get(url, {}).then(response => {
            const res = response.data;
            if (res.status === 0) {
                const searchText = `可搜索 ${res.data} 个文件`;
                this.setState({
                    searchText,
                    totalNum: res.data
                })
            }
        })
    }
    /**
     * 文件搜索时 根据查询内容更新浏览器URL
     */
    resetUrl =(searchVal)=>{
        let newUrl ='';
        if(searchVal !==''){
            newUrl = location.origin + '/#/searchResult?search=' + encodeURI(searchVal)
        }else{
            newUrl = location.origin + '/#/searchResult'
        }
        location.href = newUrl
    }
    changeThrottle  = (bookName,type) => {
        const searchType = this.state.searchType;
        let url ='';
        if(searchType === 'user'){
            url = '/user';
        }else{
            url = '/book/_search';
        }
        sessionStorage.setItem('searchVal',bookName)
        let pageNum =1;
        if(type === 'search'){
            pageNum =1;
            this.setState({
                pageNum
            })
        }else{
            pageNum = this.state.pageNum;
        }
        const requestJson = {
            keyword: bookName,
            pn: pageNum,
            ps: this.state.pageSize
        }

        if (bookName === '') {
            const searchText = `可搜索 ${this.state.totalNum} 个文件`
            let isEmpty = false;
            if(this.state.totalNum === 0)isEmpty =true;
            this.setState({ showTable: false, searchText,showEmpty:isEmpty })
        } else {
            HTTP.get(url, { params: requestJson }).then(response => {
                const res = response.data;
                if (res.status === 0) {
                    const searchText = `找到约 ${res.data.total} 条结果`
                    let isEmpty = false;
                    // if(res.data.total === 0)isEmpty =true;
                    this.setState({
                        showBottomTip:false,
                        result:res.data.total,
                        showTable: true,
                        showEmpty:isEmpty,
                        searchText: searchText,
                        tableData: res.data.list
                    })
                } else {
                    message.error(res.error)
                }
            })
        }
    } 
    searchBook = (e, type) => {
        const bookName = type === 'search' ? e.target.value : e;
        this.changeThrottle(bookName,type) // 对用户输入进行判断
        this.setState({searchBookName:bookName})

    }
    sendToKindle = (record,isOverLimit,hideKindle) => {
        if(this.unLogin){
            return this.unLoginTip();
        }
        if(isOverLimit || hideKindle) return message.info('请选择10M内的TXT、PDF或MOBI文件');
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        const bid = record.id;
        if(userInfo){
            const kindle_email = userInfo.kindle_email;
            if(!kindle_email)return message.info('请到设置页面添加您的kindle邮箱')
        }else{
            return message.info('请到设置页面添加您的kindle邮箱')
        }

        const url = `/book/${bid}/_push`;
        HTTP.post(url, {}).then(response => {
            const res = response.data;
            if (res.status === 0) {
                message.success('推送成功！')
            } else {
                message.error(res.error)
            }
        })
    }
    handleChange = (selectedRowKeys, selectedRows) => {
        this.setState({
            tableSelectedRowKeys: selectedRowKeys
        })
    }
    handleSelect = (record, selected, selectedRows) => {
        let isShowCheckBox = false;
        if (selectedRows.length > 0) {
            isShowCheckBox = true;
        }
        this.setState({
            selectedRow: selectedRows,
            showCheckBox: isShowCheckBox
        })
    }
    handleSelectAll = (selected, selectedRows, changeRows) => {
        if (selected) {
            const selectedLen = this.state.selectedRow.length;
            if (selectedLen > 0) {
                this.setState({
                    tableSelectedRowKeys: [],
                    selectedRow: [],
                    showCheckBox: false
                })
            } else {
                this.setState({ showCheckBox: true, selectedRow: selectedRows })
            }
        } else {
            this.setState({ showCheckBox: false })
        }
    }
    toLogin = () => {
        this.props.history.push('/login')
    }
    toUserInfo = () => {
        this.props.history.push('/userInfo')
    }
    toIndex = () => {
        if(this.isExternalLink){
            location.href = location.origin;
        }else{
            this.props.history.go(-1)
        }
        
    }
    handleRadioChange = e => {
        this.setState({
            fileType: e.target.value,
        });
    };
    showDeleteConfirm = (type, item) => {
        const _this = this;
        const ids = [];
        let bookIds = "";
        if (type === 'single') {
            bookIds = item.id.toString();
        } else {
            this.state.selectedRow.forEach(item => {
                ids.push(item.id)
            })
            bookIds = ids.join(',');
        }
        confirm({
            title: '删除文件',
            content: '删除后将不可找回，确认删除？',
            okText: '删除',
            className: 'confirmDialog',
            okType: 'danger',
            cancelText: '取消',
            onOk() {
                _this.deleteBooks(bookIds, ids)
            },
            onCancel() {
                
            },
        });
    }
    deleteBooks = (bookIds, ids) => {
        const url = '/book';
        HTTP.delete(url, { params: { book_ids: bookIds } }).then(response => {
            const res = response.data;
            if (res.status === SUCCESS_CODE) {
                message.success('删除成功！');
                this.searchBook(this.state.searchBookName, 'delete')
            } else {
                message.error(res.error)
            }
        })
    }
    fileShare = (type, id) => {
        const ids = [];
        let bookIds = "";
        if (type === "row") {
            bookIds = id;
        } else {
            this.state.selectedRow.forEach(item => {
                ids.push(item.id)
            })
            bookIds = ids.join(',');
        }
        const shareUrl = location.origin + "/#/share?bid=" + bookIds;
        this.showShareConfirm(shareUrl)
    }
    showShareConfirm = (shareUrl) => {
        confirm({
            title: '分享文件',
            content: <div><Input className="shareUrl" disabled defaultValue={shareUrl} /><p className="desc">把链接通过微信、QQ、微博等方式分享给好友</p></div>,
            okText: '复制',
            className: 'confirmDialog',
            cancelText: '取消',
            onOk() {
                copy(shareUrl);
                message.success('复制成功')
            },
            onCancel() {
                
            },
        });
    }
    fileTypeChange = (type, item) => {
        const ids = [];
        let defType = 0;
        let bookId = "";

        if (type === 'single') {
            bookId = item.id.toString();
            defType = item.is_public;
        } else {
            this.state.selectedRow.forEach(item => {
                ids.push(item.id);
                defType = defType || item.is_public;
            })
            bookId = ids.join(',')
        }
        const _this = this;
        confirm({
            title: '修改类型',
            content: <div className="radioWarp"><RadioGroup defaultValue={defType} onChange={this.handleRadioChange} >
                <div className="radioItem"><Radio value={1}>公开</Radio></div>
                <div className="radioItem"><Radio value={0}>私有</Radio></div>
            </RadioGroup></div>,
            okText: '确认',
            className: 'confirmDialog',
            cancelText: '取消',
            onOk() {
                const isPublic = _this.state.fileType;
                _this.modifyFileType(bookId, isPublic);
            },
            onCancel() { }
        });
    }
    modifyFileType = (bookId, isPublic) => {
        const url = '/book/_public';
        HTTP.put(url, { book_ids: bookId, is_public: isPublic }).then(response => {
            const res = response.data;
            if (res.status === 0) {
                const tableData = this.state.tableData;
                tableData.forEach(item => {
                    if (item.id === bookId) item.is_public = isPublic;
                })
                this.setState({
                    tableData
                })
                message.success('修改成功！')
            } else {
                message.error(res.error)
            }
        })
    }
    handleNameChange = (e) => {
        const bookName = e.target.value;
        this.setState({
            bookName
        })
    }
    renameDialog = (item) => {
        const nameSplit = item.title.split('.');
        const bookType = nameSplit.pop();
        const bookName = nameSplit.join('.');
        const _this = this;
        const inputHtml = <div><Input allowClear defaultValue={bookName} placeholder="" onChange={(e) => { this.handleNameChange(e) }} /></div>;
        confirm({
            title: '名称修改',
            content: <div>{inputHtml}</div>,
            okText: '确认',
            className: 'confirmDialog',
            cancelText: '取消',
            onOk() {

                _this.changeBookName(item,bookType);
            },
            onCancel() { }
        });
    }
    changeBookName = (item,bookType) => {
        const url = `/file/${item.id}/_info`;
        let bookName = this.state.bookName + '.'+bookType;
        HTTP.put(url, { title: bookName }).then(response => {
            const res = response.data;
            if (res.status === 0) {
                message.success('修改成功！')
                this.searchBook(this.state.searchBookName, 'cahngeName')
            } else {
                message.error(res.error)
            }
        })
    }
    handleTipCheckBox=e=>{
        if(e.target.checked){
            sessionStorage.setItem("noMoreTip",'1')
        }else{
            sessionStorage.setItem("noMoreTip",'0')
        }
    }
    handleOkTip=()=>{
        const bookUrl = this.state.currBookUrl;
        this.setState({showTipModal:false},()=>{
            window.open(bookUrl, "_blank")
        })
    }
    toDownloadCenter=()=>{
        this.props.history.push('/downloadCenter')
    }
    readerBook=(bookInfo)=>{
        return message.info('暂不支持在线预览，请下载后查看')
        if (!bookInfo.url) return message.error('书本链接不存在！')
        const userAgent = navigator.userAgent;
        const unAllowOnline = ['txt','mobi','azw3']
        if (bookInfo.extension === 'pdf') {
            if (userAgent.indexOf("Chrome") > -1) {
                window.open(bookInfo.url, "_blank")
            } else {
                const noMoreTip = sessionStorage.getItem('noMoreTip')
                if(noMoreTip==='1'){
                    window.open(bookInfo.url, "_blank")
                }else{
                    this.setState({showTipModal:true,currBookUrl:bookInfo.url})
                }
            }

        }else if(unAllowOnline.includes(bookInfo.extension)){
            return message.error('txt、mobi、azw3格式不支持在线查看，请下载后查看')
        } else {
            sessionStorage.setItem('bookInfo', JSON.stringify(bookInfo));
            location.href = '#/reader?search='+JSON.stringify(this.state.searchBookName);
        }
    }
    getBookC =(book_id,type)=>{

        const bookId = book_id.toString();
        const url =`/book/${bookId}/_category`;
        
        HTTP.get(url,{}).then(response=>{
            const res = response.data;
            if(res.status === 0){
                const selectedTag = res.data === '' ? [] :res.data.split(',');
                this.setState({
                    tipType:type,
                    selectedTag:selectedTag,
                    selectBookId:bookId,
                    showTagDialog:true
                })
            }
        })
    }
    fileClone = (type, item) => {
        const userInfo = localStorage.getItem('userInfo');
        if(!userInfo){
            this.unLoginTip();
            return;
        }
        const ids = [];
        let bookId = "";
        if (type === 'single' || type === 'singleTip') {
            // bookId = item.id.toString();
            this.getBookC(item.id,type)
            
        } else {
            this.state.selectedRow.forEach(item => {
                ids.push(item.id);
            })
            bookId = ids.join(',')
            this.setState({
                tipType:type,
                selectBookId:bookId,
                showTagDialog:true
            })
        }

    }
    unLoginTip=()=>{
        const _this = this;
        confirm({
            title: '请登录',
            content: "登录后可使用该功能",
            okText: '登录',
            className:'confirmDialog',
            cancelText: '取消',
            onOk() {
                _this.props.history.push('/login?from=searchPage')
            },
            onCancel() {}
          });
    }
        /**
     * 保存文件标签
     */
    saveTagChange =()=>{
        const cloneType = this.state.tipType;
        const bookid = this.state.selectBookId;
        const categoryList = this.state.selectedTag;
        // const categoryIds =[];
        let url ='';
        let succText =''
        // categoryList.forEach(item=>{
        //     if(item.isChecked){
        //         categoryIds.push(item.id)
        //     }
        // })
        const category_id = categoryList.join(',')
        // if(category_id ==='' && cloneType ==='singleTip')return message.error('标签不能为空！')
        let requestJson ={};
        if(category_id === ''){
            requestJson={book_ids:bookid,is_public:'0'}
        }else{
            requestJson={book_ids:bookid,category_ids:category_id,is_public:'0'}
        }
        
        if(cloneType !== 'singleTip'){
            url =`/book/_save`;
            succText ='克隆成功！'
            HTTP.post(url,requestJson).then(response=>{
                const res = response.data;
                if(res.status === 0){
                    this.setState({
                        showTagDialog:false
                    })
                    message.success(succText)
                }else{
                    message.error(res.error);
                }
            })
        }else{
            requestJson ={category_ids:category_id};
            url = `/book/${bookid}/_category`;
            succText ='修改成功！'
            HTTP.put(url,requestJson).then(response=>{
                const res = response.data;
                if(res.status === 0){
                    this.setState({
                        showTagDialog:false
                    })
                    message.success(succText)
                }else{
                    message.error(res.error);
                }
            })
        }
        


    }
    // handleCheckBox(e,id) {
    //     const isChecked = e.target.checked;
    //     const newList =[]
    //     this.state.categoryList.forEach(item=>{
    //         if(item.id === id){
    //             item.isChecked = isChecked
    //         }
    //         newList.push(item);
    //     })
    //     this.setState({
    //         categoryList:newList
    //     })
    // }
    handleCheckBox(e,id) {
        const isChecked = e.target.checked;
        const selectedTag = this.state.selectedTag;
        let currSelectedTag = [];
        if(isChecked){
            selectedTag.push(id.toString());
            currSelectedTag = selectedTag;
        }else{
            currSelectedTag = selectedTag.filter(item=>{
                return item !== id.toString();
            })
        }
        this.setState({
            selectedTag:currSelectedTag
        })
    }
    // fileDownload = (href) => {
    //     const a = document.createElement("a"), //创建a标签
    //         e = document.createEvent("MouseEvents"); //创建鼠标事件对象
    //     e.initEvent("click", false, false); //初始化事件对象
    //     a.href = href; //设置下载地址
    //     // a.download = name; //设置下载文件名
    //     a.dispatchEvent(e); //给指定的元素，执行事件click事件
    //     this.setState({isLoading:false})
    // }
    showDownloadDialog =(type, item)=>{
        
        if(this.unLogin){
            return this.unLoginTip();
        }
        let secondsToGo = 3;
        const _this = this;
        const bookId = item.id;
        const format = item.extension || '';
        //去掉下载格式弹窗
        // if(format.toLocaleLowerCase() === 'pdf'){
        //     this.setState({currBookId:bookId},()=>{
        //         this.createDownload(format)
        //     })
        // }else{
        //     _this.setState({
        //         currBookId:bookId,
        //         format,
        //         downloadModal:true
        //     })
        // }
        this.setState({currBookId:bookId},()=>{
            this.createDownload(format)
        })


        // let timer = null;
        // let timer2 = null;
        // timer = setInterval(() => {
        //     secondsToGo -= 1;
        //     modal.update({
        //         content: `${secondsToGo}秒后开始自动下载`,
        //     });
        //   }, 1000);
        // const modal = confirm({
        //     title: '下载文件',
        //     content: `${secondsToGo}秒后开始自动下载`,
        //     okText: '   直接下载',
        //     className: 'confirmDialog',
        //     cancelText: '转码下载',
        //     onOk() {
        //         clearInterval(timer);
        //         clearTimeout(timer2);
        //         _this.setState({
        //             currBookId:bookId
        //         },()=>{
        //             _this.createDownload(format)
        //         })
        //     },
        //     onCancel() { 
        //         clearInterval(timer);
        //         clearTimeout(timer2);
        //         _this.setState({
        //             currBookId:bookId,
        //             format,
        //             downloadModal:true
        //         })
        //     }
        // });

        // timer2 = setTimeout(() => {
        //     clearInterval(timer);
        //     _this.setState({
        //         currBookId:bookId
        //     },()=>{
        //         _this.createDownload(format)
        //     })
        //     modal.destroy();
        //   }, secondsToGo * 1000);
    }
    //创建下载
    createDownload=(type)=>{
        const currBookId = this.state.currBookId;
        const url =`/book/${currBookId}/_download`
        HTTP.post(url,{format:type}).then(response=>{
            const res = response.data;
            if(res.status === SUCCESS_CODE){
                this.setState({downloadModal:false,showDownloadTip:true,showPoint:true})
                setTimeout(()=>{this.setState({showDownloadTip:false})},3000)
            }else{
                message.error(res.error);
            }
        })
    }
    // downloadEvent = (type, item) => {
    //     if(this.unLogin){
    //         return this.unLoginTip();
    //     }
    //     let bookIds = "";
    //     const ids = []
    //     if (type === 'single') {
    //         bookIds = item.id;
    //     } else {
    //         const fileList = this.state.selectedRow;
    //         fileList.forEach(item => {
    //             ids.push(item.id)
    //             // download(item.title, item.url);
    //         })
    //         bookIds = ids.join(",");
    //     }
    //     this.getDownUrl(bookIds)
    // }
    // getDownUrl = (ids) => {
    //     this.setState({isLoading:true})
    //     const url = "/book/_package";
    //     HTTP.get(url, { params: { book_ids: ids } }).then(response => {
    //         const res = response.data;
    //         if (res.status === 0) {
    //             this.fileDownload(res.data)
    //         }else{
    //             message.error(res.error);
    //         }
    //     })
    // }
    handleTagChange=(e,name)=>{
        const value = e.target.value;
        const newTagInfo = this.state.editTagInfo;
        newTagInfo[name] = value;
        this.setState({
            editTagInfo:newTagInfo
        })
    }
    addNewTag=(type,id)=>{
        if(type === 'create'){
            const title = this.state.editTagInfo.addTag;
            const url = '/category';
            if(title==='')return message.error('标签名称不能为空！');
            HTTP.post(url,{title:title}).then(response=>{
                const res = response.data;
                const newTagInfo = this.state.editTagInfo;
                newTagInfo['addTag'] = '';
                if(res.status === 0){
                    this.setState({
                        isAddTag:false,
                        editTagInfo:newTagInfo
                    })
                    message.success('创建成功！')
                    this.getCategory();
                }
            })
        }else{
            const url =`/category/${id}`;
            const title = this.state.editTagInfo.newTag;
            HTTP.put(url,{title:title}).then(response=>{
                const res = response.data;
                const newTagInfo = this.state.editTagInfo;
                newTagInfo['newTag'] = '';
                if(res.status === 0){
                    this.setState({
                        editTag:null,
                        editTagInfo:newTagInfo
                    })
                    message.success('修改成功！')
                    this.getCategory();
                }
            })
        }
    }
    delTag=(id)=>{
        const url = `/category/${id}`;
        HTTP.delete(url,{}).then(response=>{
            const res = response.data;
            if(res.status === 0){
                this.getCategory();
                message.success('删除成功！')
            }else{
                message.error(res.error)
            }
        })
    }
    getBase64 =(img, callback)=> {
        const reader = new FileReader();
        reader.addEventListener('load', () => callback(reader.result));
        reader.readAsDataURL(img);
      }
      
     beforeUpload=(file)=> {

        const isJPG = file.type === 'image/jpeg'|| file.type === 'image/png';
        if (!isJPG) {
          message.error('图片仅支持jpg、png格式!');
        }
        const isLt10M = file.size / 1024 / 1024 < 10;
        if (!isLt10M) {
          message.error('图片大小不能超过10MB!');
        }
        return isJPG && isLt10M;
      }
      handleImgChange = info => {
        if (info.file.status === 'uploading') {
          this.setState({ loading: true });
          return;
        }
        if (info.file.status === 'done') {
          // Get this url from response in real world.
          this.getBase64(info.file.originFileObj, imageUrl =>
            this.setState({
              imageUrl,
              loading: false,
            }),
          );
        }
      };
    handleStatusChange =(e)=>{
        const userStatus =e.target.value;
        this.setState({userStatus})
    }
    userStatusChange = () => {
        let userIdArr = [];
        let defStatus = 1;
        this.state.selectedRow.forEach(item=>{
            userIdArr.push(item.id)
        });
        const userId = userIdArr.join(',')
        const _this = this;
        confirm({
            title: '修改账户状态',
            content: <div className="radioWarp"><RadioGroup defaultValue={defStatus} onChange={this.handleStatusChange} >
                <div className="radioItem"><Radio value={1}>激活</Radio></div>
                <div className="radioItem"><Radio value={2}>冻结</Radio></div>
            </RadioGroup></div>,
            okText: '确认',
            className: 'confirmDialog',
            cancelText: '取消',
            onOk() {
                const userStatus = _this.state.userStatus || defStatus;
                const url = '/user'
                HTTP.put(url,{user_ids:userId,status:userStatus}).then(response=>{
                    const res = response.data;
                    if(res.status === 0){
                        _this.setState({userStatus:''})
                        _this.searchBook(_this.state.searchBookName, 'searchUser')
                        message.success('修改成功！')
                    }else{
                        message.error(res.error)
                    }
                })
            },
            onCancel() { }
        });
    }
    edit = (item, fileName, title) => {
        this.setDialog(item, fileName, title);
    }
    handleModify = (e, fileName) => {
        const newUserInfo = this.state.newUserInfo;
        newUserInfo[fileName] = e.target.value;
        this.setState({
            newUserInfo
        });
    };
    getDialogContent = (oldVal, fileName) => {
        let currHtml = '';
        let fileType = oldVal[fileName];
        const radioHtml = <div className="radioWarp"><RadioGroup defaultValue={fileType} onChange={(e) => { this.handleModify(e, fileName) }} >
            <div className="radioItem"><Radio value={1}>激活</Radio></div>
            <div className="radioItem"><Radio value={2}>冻结</Radio></div>
        </RadioGroup></div>;
        const inputHtml = <div><Input allowClear defaultValue={oldVal[fileName]} placeholder="" onChange={(e) => { this.handleModify(e, fileName) }} /></div>;
        const pwdHtml = <div className="radioWarp">
            {/* <div className="radioItem"><Input.Password className="loginInput" autoComplete="off" datasource={[]} type="password" placeholder="原密码" onChange={(e) => { this.handleModify(e, 'old_pwd') }} /></div> */}
            <div className="radioItem"><Input.Password className="loginInput" autoComplete="off" datasource={[]} type="password" placeholder="新密码" onChange={(e) => { this.handleModify(e, 'new_pwd') }} /></div>
        </div>;
        const uploadButton = (
            <div>
                <Icon type={this.state.loading ? 'loading' : 'plus'} />
                <div className="ant-upload-text">Upload</div>
            </div>
        );
        const imageUrl = oldVal[fileName];
        const props = {
            name: 'file',
            action:'/user/_photo',
            headers: {
                authorization: cookie.get('Authorization')
            },
            beforeUpload:this.beforeUpload,
            onChange:this.handleImgChange
          };
        const imgHtml = <Upload
            name="photo"
            listType="picture-card"
            className="avatar-uploader userImgUpload"
            showUploadList={false}
            action={`/user/_photo?access_token=${cookie.get('Authorization')}`}
            beforeUpload={this.beforeUpload}
            onChange={this.handleImgChange}
        >
            {imageUrl ? <img src={imageUrl} alt="avatar" /> : uploadButton}
        </Upload>
        switch (fileName) {
            case 'status':
                currHtml = radioHtml;
                break;
            case 'changePWD':
                currHtml = pwdHtml;
                break;
            case 'photo':
                currHtml = imgHtml;
                break;
            default:
                currHtml = inputHtml
        }
        return currHtml;
    }
    setDialog = (oldVal, fileName, title) => {
        const _this = this;
        const contentHtml = this.getDialogContent(oldVal, fileName)
        confirm({
            title: title,
            content: <div>{contentHtml}</div>,
            okText: '确认',
            className: 'confirmDialog',
            cancelText: '取消',
            onOk() {
                _this.updateUserInfo(oldVal['id'],fileName);
            },
            onCancel() { }
        });
    }
    updateUserInfo = (id,fileName) => {
        const { newUserInfo, userInfo } = this.state;
        const requestData = {};
        let url = '';
        if (fileName === 'changePWD') {
            requestData['new_pwd'] = newUserInfo['new_pwd'];
            url = `/user/${id}/_info`
        } else {
            requestData[fileName] = newUserInfo[fileName];
            url = `/user/${id}/_info`
        }
        HTTP.post(url, requestData).then(response => {
            const res = response.data;
            if (res.status === 0) {
                this.searchBook(this.state.searchBookName, 'searchUser')
                message.success('修改成功！')
            } else {
                if(fileName ==='email'){
                    message.error('已存在相同的邮箱')
                }else{
                    message.error(res.error)
                }
                
            }
        })
    }
    pageChange =(current, pageSize)=>{
        this.setState({
            pageNum:current
        },()=>{
            this.searchBook(this.state.searchBookName, 'pageChange')
        });
    }
    handleVisibleChange = popoverVisible => {
        const lastVal = this.state.popoverVisible;
        if(lastVal === popoverVisible){
            this.setState({ popoverVisible:'' });
        }else{
            this.setState({ popoverVisible });
        }
    };
    handlePcVisibleChange = popoverPcVisible => {
        const lastVal = this.state.popoverPcVisible;
        if(lastVal === popoverPcVisible){
            this.setState({ popoverPcVisible:'' });
        }else{
            this.setState({ popoverPcVisible });
        }
    };
    render() {
        // const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        const cookUserInfo = cookie.get('userInfo') || null
        const userInfo = JSON.parse(cookUserInfo)
        let isLogin = false; let userName = ''; let photo = ''; let hasPhoto = false;let role=1;
        if (userInfo) {
            role = userInfo.role;
            if (userInfo.photo && userInfo.photo.length > 0) {
                photo = userInfo.photo;
                hasPhoto = true;
            } else {
                userName = userInfo.nick_name[0];
                isLogin = true;
            }
        }
        const currPagination =this.state.result>10?{
            total:this.state.result,
            pageSize:this.state.pageSize,
            current:this.state.pageNum,
            onChange:this.pageChange.bind(this)
        }:false
        const currSmallPagination =this.state.result>10?{
            size:'small',
            total:this.state.result,
            pageSize:this.state.pageSize,
            current:this.state.pageNum,
            onChange:this.pageChange.bind(this)
        }:false
        const searchType = this.state.searchType;
        const columns = [
            {
                title: '名称',
                dataIndex: 'title',
                key: 'title',
                render: (text, record) => {
                    const fileIcon = util.getFileIcon(record.extension);
                    let displayText = <div className="fileName">
                        <img className="fileIcon" src={fileIcon} alt="" />
                        <span style={{cursor:'pointer'}} onClick={()=>{this.readerBook(record)}} className={`${record.is_owner === 1 ? 'isOwerFile' : ''}`}>{text}</span>
                    </div>;
                    return displayText;
                }
            },
            {
                title: '大小',
                dataIndex: 'size',
                key: 'size',
                render: (text) => {
                    let val
                    if(!text){
                        val ='0MB'
                    }else{
                        val= text.toFixed(2) + 'MB';
                    }
                    return val;
                }
            },
            {
                title: '上传时间',
                dataIndex: 'add_time',
                key: 'add_time',
                render: (text) => {
                    text =text||'';
                    let val = text.substr(0,10);
                    return val;
                }
            },
            {
                title: '操作',
                dataIndex: 'opt',
                key: 'opt',
                render: (text, record) => {
                    const isOver10M = record.size > 10;
                    const isOwner = record.is_owner === 1;
                    const fileType = record.extension? record.extension.toLocaleLowerCase() :'';
                    const limitType = ['azw3','epub'];
                    const hideKindle = limitType.includes(fileType);
                    const optContent = (
                        <div onClick={()=>{this.setState({popoverPcVisible:''})}}>
                            {role !== 2 && !isOwner?<p className="optItem" onClick={() => { this.fileClone('single', record)}}>克隆</p>:""}
                            <p className="optItem" onClick={() => { this.fileShare("row", record.id) }}>分享</p>
                            <p className={`${isOver10M || hideKindle ? 'overLimit':''} optItem`} onClick={() => { this.sendToKindle(record,isOver10M,hideKindle) }}>kindle</p>
                            {role !== 2 && !isOwner?<p className="optItem" onClick={() => { this.showDownloadDialog('single', record) }}>下载</p>:""}
                            {role === 2 || isOwner?<p className="optItem" onClick={() => { this.showDownloadDialog('single', record) }}>下载</p>:""}
                            {role === 2 || isOwner?<p className="optItem" onClick={() => { this.fileClone('singleTip', record)}}>标签</p>:""}
                            {role === 2 || isOwner?<p className="optItem" onClick={() => { this.renameDialog(record) }}>重命名</p>:""}
                            {role === 2 || isOwner?<p className="optItem" onClick={() => { this.fileTypeChange('single', record) }}>文件类型</p>:""}
                            {role === 2 || isOwner?<p className="optItem" style={{color:'#FF3B30'}} onClick={() => { this.showDeleteConfirm('single', record) }}>删除</p>:""}
                        </div>
                    );
                    const optHtml = <div className="optWarp">

                        <Popover placement="rightTop" content={optContent} trigger="click" visible={this.state.popoverPcVisible == record.id} onVisibleChange={()=>{this.handlePcVisibleChange(record.id)}}>
                            <Button className="btn_more_opt"><Icon style={{fontSize:'16px'}} type="ellipsis"  /></Button> 
                        </Popover>
                    </div>
                    return optHtml;
                }
            },
        ];
        const smallColumns = [
            {
                title: '名称',
                dataIndex: 'title',
                key: 'title',
                render: (text, record) => {
                    const fileIcon = util.getFileIcon(record.extension);
                    let displayText = <div className="fileName">
                        <img className="fileIcon" src={fileIcon} alt="" />
                        <span style={{cursor:'pointer'}} onClick={()=>{this.readerBook(record)}} className={`${record.is_owner === 1 ? 'isOwerFile' : ''} bookName`}>{text}</span>
                    </div>;
                    return displayText;
                }
            },
            {
                title: '操作',
                wdith:'90px',
                dataIndex: 'opt',
                key: 'opt',
                render: (text, record) => {
                    const isOver10M = record.size > 10;
                    const isOwner = record.is_owner === 1;
                    const fileType = record.extension? record.extension.toLocaleLowerCase() :'';
                    const limitType = ['azw3','epub'];
                    const hideKindle = limitType.includes(fileType);
                    const optContent = (
                        <div onClick={()=>{this.setState({popoverVisible:''})}}>
                            {role !== 2 && !isOwner?<p className="optItem" onClick={() => { this.fileClone('single', record)}}>克隆</p>:""}
                            <p className="optItem" onClick={() => { this.fileShare("row", record.id) }}>分享</p>
                            <p className={`${isOver10M || hideKindle ? 'overLimit':''} optItem`} onClick={() => { this.sendToKindle(record,isOver10M,hideKindle) }}>kindle</p>
                            {role !== 2 && !isOwner?<p className="optItem" onClick={() => { this.showDownloadDialog('single', record) }}>下载</p>:""}
                            {role === 2 || isOwner?<p className="optItem" onClick={() => { this.showDownloadDialog('single', record) }}>下载</p>:""}
                            {role === 2 || isOwner?<p className="optItem" onClick={() => { this.fileClone('singleTip', record)}}>标签</p>:""}
                            {role === 2 || isOwner?<p className="optItem" onClick={() => { this.renameDialog(record) }}>重命名</p>:""}
                            {role === 2 || isOwner?<p className="optItem" onClick={() => { this.fileTypeChange('single', record) }}>文件类型</p>:""}
                            {role === 2 || isOwner?<p className="optItem" style={{color:'#FF3B30'}} onClick={() => { this.showDeleteConfirm('single', record) }}>删除</p>:""}
                        </div>
                    );
                    const optHtml = <div className="optWarp">

                        <Popover placement="rightTop" content={optContent} trigger="click" visible={this.state.popoverVisible == record.id} onVisibleChange={()=>{this.handleVisibleChange(record.id)}}>
                            <Button className="btn_more_opt"><Icon style={{ fontSize: '16px' }} type="ellipsis" /></Button>
                        </Popover>
                    </div>
                    return optHtml;
                }
            },
        ];
        const userCol = [{
            title: '用户名',
            dataIndex: 'nick_name',
            key: 'nick_name',
            render: (text, record) => {
                return (<div className="tableUserName">{!record.photo ? <span className="name">{text.substr(0, 1)}</span> : <img className="name" src={record.photo} />} {text}</div>)
            }
        }, {
            title: '邮箱',
            dataIndex: 'email',
            key: 'email'
        }, {
            title: '注册日期',
            dataIndex: 'add_time',
            key: 'add_time',
            render: (text, record) => {
                return text.substr(0, 10);
            }
        }, {
            title: '存储空间',
            dataIndex: 'storage_used',
            key: 'storage_used',
            render: (text, record) => {
                return (text + 'MB / ' + record.storage_limit + 'MB')
            }
        }, {
            title: '账户状态',
            dataIndex: 'status',
            key: 'status',
            render: (text, record) => {
                return <span className={`${record.status === 1 ? 'isActive' : 'unActive'}`}>{text === 1 ? '激活' : '冻结'}</span>
            }
        }, {
            title: '操作',
            dataIndex: 'opt',
            key: 'opt',
            render: (text, record) => {
                const optContent = (
                    <div onClick={()=>{this.setState({popoverPcVisible:''})}}>
                        {/* onClick={() => { this.edit(record, 'photo', '修改头像') }} */}
                        <p className="optItem" onClick={() => { this.edit(record, 'photo', '修改头像') }}>修改头像</p> 
                        <p className="optItem" onClick={() => { this.edit(record, 'nick_name', '修改用户名') }}>修改用户名</p>
                        <p className="optItem" onClick={() => { this.edit(record, 'email', '修改邮箱') }}>修改邮箱</p>
                        <p className="optItem" onClick={() => { this.edit(record, 'changePWD', '修改密码') }}>修改密码</p>
                        <p className="optItem" onClick={() => { this.edit(record, 'status', '修改账户状态') }}>账户状态</p>
                        <p className="optItem" onClick={() => { this.edit(record, 'storage_limit', '修改存储空间') }}>存储空间</p>
                    </div>
                );
                const optHtml = <div className="optWarp">

                    <Popover placement="rightTop" content={optContent} trigger="click" visible={this.state.popoverPcVisible == record.id} onVisibleChange={()=>{this.handlePcVisibleChange(record.id)}}>
                        <Button className="btn_more_opt" ><Icon style={{ fontSize: '16px' }} type="ellipsis" /></Button>
                    </Popover>
                </div>
                return optHtml;
            }
        }]
        const smallUserCol = [{
            title: '用户名',
            dataIndex: 'nick_name',
            key: 'nick_name',
            render: (text, record) => {
                return (<div className="tableUserName">{!record.photo ? <span className="name">{text.substr(0, 1)}</span> : <img className="name" src={record.photo} />} {text}</div>)
            }
        },{
            title: '操作',
            dataIndex: 'opt',
            key: 'opt',
            render: (text, record) => {
                const optContent = (
                    <div onClick={()=>{this.setState({popoverVisible:''})}}>
                        {/* onClick={() => { this.edit(record, 'photo', '修改头像') }} */}
                        <p className="optItem" onClick={() => { this.edit(record, 'photo', '修改头像') }}>修改头像</p> 
                        <p className="optItem" onClick={() => { this.edit(record, 'nick_name', '修改用户名') }}>修改用户名</p>
                        <p className="optItem" onClick={() => { this.edit(record, 'email', '修改邮箱') }}>修改邮箱</p>
                        <p className="optItem" onClick={() => { this.edit(record, 'changePWD', '修改密码') }}>修改密码</p>
                        <p className="optItem" onClick={() => { this.edit(record, 'status', '修改账户状态') }}>账户状态</p>
                        <p className="optItem" onClick={() => { this.edit(record, 'storage_limit', '修改存储空间') }}>存储空间</p>
                    </div>
                );
                const optHtml = <div className="optWarp">

                    <Popover placement="rightTop" content={optContent} trigger="click" visible={this.state.popoverVisible == record.id} onVisibleChange={()=>{this.handleVisibleChange(record.id)}} >
                        <Button className="btn_more_opt"><Icon style={{ fontSize: '16px' }} type="ellipsis" /></Button>
                    </Popover>
                </div>
                return optHtml;
            }
        }];
        // smallUserCol.push(userCol[0]);
        // smallUserCol.push(userCol[5]);

        const rowSelection = {
            onChange: this.handleChange,
            onSelect: this.handleSelect,
            onSelectAll: this.handleSelectAll,
            selectedRowKeys: this.state.tableSelectedRowKeys
        };
        const contentTip ='下载文件处理中，请点击查看详情'
        return (
            <Spin tip="正在下载请稍等" spinning={this.state.isLoading}>
            <div className="searchResultWarp">
                <Layout>
                    <div className="publicHeader">
                        <div className="menuBtn"><Icon onClick={this.toIndex} type={'arrow-left'} /></div>
                        <div className="searchWarp"><Input ref={(input) => this.input = input} allowClear placeholder="搜索" value={this.state.searchBookName} onChange={(value) => { this.searchBook(value, 'search') }} /> <span className="result">{this.state.searchText}</span></div>
                        {isLogin || hasPhoto?<div className="downloadMark" onClick={this.toDownloadCenter}>
                        <Popover  placement="bottomRight" content={contentTip} visible={this.state.showDownloadTip}>
                            <img className="iconDownload" src={iconDownload} alt=""/>
                            {this.state.showPoint?<i className="point"></i>:""}
                        </Popover>
                        </div>:""}
                        <div className={`${hasPhoto || isLogin ? 'hideInPhone':''} loginInfo`} > {hasPhoto ? <img className="userPhoto" onClick={this.toUserInfo} src={photo} alt="" /> : (!isLogin ? <span onClick={this.toLogin}>登录</span> : <span className="userName" onClick={this.toUserInfo}>{userName}</span>)} </div>
                    </div>

                    <Layout className="ant-layout-has-sider">
                        <Layout>
                            <Content className="mainContent">
                                {this.state.showTable && !this.state.showEmpty ?
                                    <div className="myTableWarp">
                                        <div className="clearFix">
                                            <div className="title ms_fl">全部文件</div>
                                            <div className={`${this.state.showCheckBox ? 'showBtnList' : ''} btn_list ms_fr`}>
                                                {role !== 2 ? <Button className="btn btn_share" type="primary" onClick={this.fileShare}>分享</Button> : ''}
                                                {role === 2 && searchType === 'user'? <Button className="btn btn_fileType" onClick={this.userStatusChange.bind(this)}>状态</Button>:""}
                                                {/* {role !== 2 && searchType !== 'user'? <Button className="btn btn_clone" type="primary" onClick={this.fileClone}>克隆</Button> : ""} */}
                                                {/* {role !== 2 && searchType !== 'user'? <Button className="btn btn_download" onClick={this.showDownloadDialog}>下载</Button> : ""} */}
                                                {role === 2 && searchType !== 'user'? <Button className="btn btn_fileType" onClick={this.fileTypeChange.bind(this)}>类型</Button> : ""}
                                                {role === 2 && searchType !== 'user'? <Button className="btn btn_del" type="danger" onClick={this.showDeleteConfirm}>删除</Button> : ""}
                                            </div>
                                        </div>
                                        {searchType !=='user'?<Table rowKey={(record, index) => `complete${record.id}${index}`} className={`${this.state.showCheckBox ? 'showCheckBox' : ''} showInBig`} pagination={currPagination} columns={columns} rowSelection={rowSelection} dataSource={this.state.tableData} />:""}
                                        {searchType !=='user'?<Table rowKey={(record, index) => `complete${record.id}${index}`} className={`${this.state.showCheckBox ? 'showCheckBox' : ''} showInSmall`} pagination={currSmallPagination} columns={smallColumns} rowSelection={rowSelection} dataSource={this.state.tableData} />:""}

                                        {searchType ==='user'?<Table rowKey={(record, index) => `complete${record.id}${index}`} className={`${this.state.showCheckBox ? 'showCheckBox' : ''} showInBig`} pagination={currPagination} columns={userCol} rowSelection={rowSelection} dataSource={this.state.tableData} />:""}
                                        {searchType ==='user'?<Table rowKey={(record, index) => `complete${record.id}${index}`} className={`${this.state.showCheckBox ? 'showCheckBox' : ''} showInSmall`} pagination={currSmallPagination} columns={smallUserCol} rowSelection={rowSelection} dataSource={this.state.tableData} />:""}
                                    </div>
                                    : ''}
                                    {this.state.showEmpty? <EmptyComp /> :''}
                            </Content>
                        </Layout>

                    </Layout>

                </Layout>
                {this.state.showTagDialog?
                <Modal
                    width="416px" title="" visible={this.state.showTagDialog} className="tagDialog" closable={false}
                    cancelText="取消" okText="确定"
                    onOk={this.saveTagChange} onCancel={()=>{this.setState({showTagDialog:false})}}
                >
                    <div className="title">修改标签</div>
                    <div className="checkWarp">
                        <div className={`${this.state.isAddTag ? 'tagAdding':''} checkItem clearFix`}>
                            <i className="icon icon_add" title="新增" onClick={() => { this.setState({ isAddTag: true }) }}></i> 
                            <i className="icon icon_cancel" title="取消" onClick={() => { this.setState({ isAddTag: false }) }}></i>
                            <span className="addText">创建新标签</span>
                            {this.state.isAddTag ?<Input className="addTag tagInput" defaultValue="" onChange={(value)=>{this.handleTagChange(value,'addTag')}} placeholder="创建标签" />:""}
                            <i className="icon icon_ok ms_fr" title="保存" onClick={()=>{this.addNewTag('create')}}></i>
                        </div>
                        {this.state.tagList.map((item,index) => {
                            return <div key={`complete${item.id}${index}`} className={`${this.state.editTag === item.id ? 'tagAdding' :''} checkItem clearFix`}>
                                <Checkbox defaultChecked={this.state.selectedTag.includes(item.id.toString())} className="checkItem" onChange={(value)=>{this.handleCheckBox(value,item.id)}}><span className="tagText">{item.title}</span></Checkbox>
                                <i className="icon icon_del" title="删除" onClick={() => { this.delTag(item.id) }}></i>
                                <Input className="addTag tagInput" onChange={(value)=>{this.handleTagChange(value,'newTag')}} placeholder="" defaultValue={item.title} />
                                <i className="icon icon_edit ms_fr" onClick={()=>{this.setState({editTag:item.id})}}></i>
                                <i className="icon icon_ok ms_fr" title="保存" onClick={()=>{this.addNewTag('edit',item.id)}}></i>
                                </div>
                        })}
                    </div>
                </Modal>:""}
                <Modal
                    width="416px" title="阅读提示" visible={this.state.showTipModal} className="tipDialog" closable={false}
                    footer={null}
                >
                    <div className="tipContent">当前的浏览器可能无法阅读PDF文件，建议使用谷歌浏览器</div>
                    <div className="footer">
                        <Checkbox className="tipCheck" onChange={(value)=>{this.handleTipCheckBox(value)}}>不再提示</Checkbox>
                        
                        <Button type="primary" className="ms_fr" onClick={this.handleOkTip}>确认</Button>
                        <Button type="default" className="ms_fr" style={{marginRight:"14px"}} onClick={()=>{this.setState({showTipModal:false})}}>取消</Button>
                    </div>
                </Modal>
                <Modal
                    width="416px" title="请选择需要下载的格式" visible={this.state.downloadModal} className="downloadDialog" closable={true}
                    footer={null} onCancel={()=>{this.setState({downloadModal:false})}}
                >
                    <div className="content">
                        <div className="item" onClick={()=>{this.createDownload('txt')}}>
                            <img className="fileIcon" src={coverTXT} alt="" />
                            <span>TXT</span>
                            {this.state.format === 'txt' ?<img className="iconFast" src={iconFast} alt="" /> :''}
                        </div>
                        <div className="item" onClick={()=>{this.createDownload('pdf')}}>
                            <img className="fileIcon" src={coverPDF} alt="" />
                            <span>PDF</span>
                            {this.state.format === 'pdf' ?<img className="iconFast" src={iconFast} alt="" /> :''}
                        </div>
                        <div className="item" onClick={()=>{this.createDownload('mobi')}}>
                            <img className="fileIcon" src={coverMOBI} alt="" />
                            <span>MOBI</span>
                            {this.state.format === 'mobi' ?<img className="iconFast" src={iconFast} alt="" /> :''}
                        </div>
                        <div className="item" onClick={()=>{this.createDownload('epub')}}>
                            <img className="fileIcon" src={coverEPUB} alt="" />
                            <span>EPUB</span>
                            {this.state.format === 'epub' ?<img className="iconFast" src={iconFast} alt="" /> :''}
                        </div>
                        <div className="item" onClick={()=>{this.createDownload('azw3')}}>
                            <img className="fileIcon" src={coverAZW3} alt="" />
                            <span>AZW3</span>
                            {this.state.format === 'azw3' ?<img className="iconFast" src={iconFast} alt="" /> :''}
                        </div>
                    </div>
                </Modal>
                {this.state.showBottomTip?
                <div className="bottomTip">
                    <div className="title">温馨提示：</div>
                    <div className="tipContent">阅读链仅提供信息存储空间服务，所有内容仅供个人交流与学习使用，均由用户自行上传，如有侵权，将依法对被投诉内容做删除或断开链接的处理</div>
                </div>:""}
            </div>
            </Spin>
        )
    }
}

export default SearchResult;