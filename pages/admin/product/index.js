import axios from 'axios';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import NextLink from 'next/link';
import React, { useEffect, useContext, useReducer, useState, useCallback, useMemo } from 'react';
import { IoIosCloseCircle } from "react-icons/io";
import styles from "../../../styles/EditProduct.module.css";


import {
    Grid,
    List,
    ListItem,
    Typography,
    Card,
    Button,
    ListItemText,
    TextField,
    CircularProgress,
    FormControlLabel,
    Checkbox,
    Radio,
    IconButton,
    Divider,
    Box,
} from '@material-ui/core';
import { getError } from '../../../utils/error';
import { Store } from '../../../utils/Store';
import Layout from '../../../components/Layout';
import useStyles from '../../../utils/styles';
import { Controller, useForm } from 'react-hook-form';
import { useSnackbar } from 'notistack';
import { useDropzone } from 'react-dropzone';
import { Autocomplete } from '@material-ui/lab';


function reducer(state, action) {
    switch (action.type) {

        case 'UPDATE_REQUEST':
            return { ...state, loadingUpdate: true, errorUpdate: '' };
        case 'UPDATE_SUCCESS':
            return { ...state, loadingUpdate: false, errorUpdate: '' };
        case 'UPDATE_FAIL':
            return { ...state, loadingUpdate: false, errorUpdate: action.payload };
        case 'UPLOAD_REQUEST':
            return { ...state, loadingUpload: true, errorUpload: '' };
        case 'UPLOAD_SUCCESS':
            return {
                ...state,
                loadingUpload: false,
                errorUpload: '',
            };
        case 'UPLOAD_FAIL':
            return { ...state, loadingUpload: false, errorUpload: action.payload };

        default:
            return state;
    }
}

function ProductCreate() {
    const [imagesUrls, setImagesUrls] = useState([]);
    const [isOffer, setIsOffer] = useState(false)
    const [selectedImages, setSelectedImages] = useState([]);
    const [imagesWithPrincipal, setImagesWithPrincipal] = useState([]);
    const [principalIndex, setPrincipalIndex] = useState(-1);
    const [categories, setCategories] = useState([])
    const [subCategories, setSubCategories] = useState([])
    const [category, setCategory] = useState("");
    const [subCategory, setSubCategory] = useState("");
    const [isButtonDisabled, setIsButtonDisabled] = useState(false)


    const { state } = useContext(Store);
    const [{ loading, error, loadingUpdate }, dispatch] =
        useReducer(reducer, {
            loading: true,
            error: '',
        });


    const {
        handleSubmit,
        control,
        formState: { errors },
    } = useForm();

    const { enqueueSnackbar, closeSnackbar } = useSnackbar();
    const router = useRouter();
    const classes = useStyles();
    const { userInfo } = state;

    useEffect(() => {
        const imagesWithPrincipal = imagesUrls.map((image, index) => ({
            image,
            isPrincipal: index === 0,
        }));
        setImagesWithPrincipal(imagesWithPrincipal);
    }, [imagesUrls]);

    

// fetching categories and subcategories suggestions
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const response = await axios.get('/api/products/categories');
                setCategories(response.data);
            } catch (error) {
                console.error('Error fetching categories:', error);
            }
        };

        fetchCategories();
    }, []);

    
    useEffect(() => {
        const fetchSubCategories = async () => {
            try {
                const response = await axios.get('/api/products/subCategories', {
                    params: { category: category }
                });
                setSubCategories(response.data);
            } catch (error) {
                console.error('Error fetching subcategories:', error);
            }
        };
        fetchSubCategories();
    }, [category]);

    const handleCategoryChange = (event, newValue) => {
        setCategory(newValue);
        setSubCategory('');
    };

    const handleSubCategoryChange = (event, newValue) => {
        setSubCategory(newValue);
    };

    // dropzone
    const style = useMemo(
        () => ({
            ...(isDragAccept ? { borderColor: "#00e676" } : {}),
            ...(isDragReject ? { borderColor: "#ff1744" } : {}),
        }),
        [isDragAccept, isDragReject]
    );

    const onDrop = useCallback((acceptedFiles) => {
        acceptedFiles.forEach((file) => {
            setSelectedImages((prevState) => [...prevState, file]);
        });
        setIsButtonDisabled(true)
    }, []);

    const {
        getRootProps,
        getInputProps,
        isDragActive,
        isDragAccept,
        isDragReject,
    } = useDropzone({ onDrop });

    // delete 
    const handleImageDelete = (index) => {
        const updatedImages = [...selectedImages];
        updatedImages.splice(index, 1);
        const updatedUrls = [...imagesUrls];
        updatedUrls.splice(index, 1);
        setSelectedImages(updatedImages);
        setImagesUrls(updatedUrls);
        setIsButtonDisabled(true)

        if (index === principalIndex) {
            setPrincipalIndex(-1);
        } else if (index < principalIndex) {
            setPrincipalIndex(principalIndex - 1);
        }
    };
    // change principal 
    const handlePrincipalChange = (index) => {
        const updatedImages = [...selectedImages];
        const selectedImage = updatedImages[index];
        updatedImages.splice(index, 1);
        updatedImages.unshift(selectedImage);
        setSelectedImages(updatedImages);
        const updatedUrls = [...imagesUrls];
        const selectedUrl = updatedUrls[index];
        updatedUrls.splice(index, 1);
        updatedUrls.unshift(selectedUrl);
        setImagesUrls(updatedUrls);
        setPrincipalIndex(0);
    };

    // upload to cloudinary
    const uploadImages = async () => {
        if (selectedImages.length === 0) {
            enqueueSnackbar('Please select at least one image', { variant: 'error' });
            return;
        }
        try {
            const formData = new FormData();
            selectedImages.forEach((image) => {
                formData.append("file", image);
            });
            const response = await axios.post("/api/admin/upload", formData);
            setImagesUrls(response.data.imageUrls);
            setIsButtonDisabled(false)
            enqueueSnackbar('Images were successfully uploaded', { variant: 'success' });
        } catch (error) {
            enqueueSnackbar('Download failed', { variant: 'error' });
            return;
        }
    }

    // create product
    const submitHandler = async ({
        name,
        slug,
        price,
        countInStock,
        description,
    }) => {
        closeSnackbar();
        if (imagesWithPrincipal.length === 0) {
            enqueueSnackbar('Please upload at least one image', { variant: 'error' });
            return;
        }
        try {
            dispatch({ type: 'UPDATE_REQUEST' });
            await axios.post(
                "/api/admin/products",
                {
                    name,
                    slug,
                    price,
                    category,
                    subCategory,
                    images: imagesWithPrincipal,
                    isOffer,
                    countInStock,
                    description,
                },
                { headers: { authorization: `Bearer ${userInfo.token}` } }
            );
            dispatch({ type: 'UPDATE_SUCCESS' });
            enqueueSnackbar('Product created successfully', { variant: 'success' });
            router.push('/admin/products');
        } catch (err) {
            dispatch({ type: 'UPDATE_FAIL', payload: getError(err) });
            enqueueSnackbar(getError(err), { variant: 'error' });
        }
    };

   

    return (
        <Layout title="Create a product">
            <Grid container spacing={1}>
                <Grid item md={3} xs={12}>
                    <Card className={classes.section}>
                        <List>
                            <NextLink href="/admin/profile" passHref>
                                <ListItem button component="a">
                                    <ListItemText primary="Profil"></ListItemText>
                                </ListItem>
                            </NextLink>
                            {userInfo && userInfo.isAdmin && (
                                <>
                                    <NextLink href="/admin/dashboard" passHref>
                                        <ListItem button component="a">
                                            <ListItemText primary="Dashboard"></ListItemText>
                                        </ListItem>
                                    </NextLink>
                                    <NextLink href="/admin/products" passHref>
                                        <ListItem selected button component="a">
                                            <ListItemText primary="Produits"></ListItemText>
                                        </ListItem>
                                    </NextLink>
                                    <NextLink href="/admin/featuredCategories" passHref>
                                        <ListItem button component="a">
                                            <ListItemText primary="Catégories"></ListItemText>
                                        </ListItem>
                                    </NextLink>

                                </>
                            )}
                            <NextLink href="/admin/orders" passHref>
                                <ListItem button component="a">
                                    <ListItemText primary="Commandes"></ListItemText>
                                </ListItem>
                            </NextLink>
                            <NextLink href="/admin/contactUs" passHref>
                                <ListItem button component="a">
                                    <ListItemText primary="Messages"></ListItemText>
                                </ListItem>
                            </NextLink>

                        </List>
                    </Card>
                </Grid>
                <Grid item md={9} xs={12}>
                    <Card className={classes.section}>
                        <List>
                            <ListItem>
                                <Typography component="h1" variant="h1">
                                    Create a product
                                </Typography>
                            </ListItem>

                            <ListItem>
                                <form
                                    onSubmit={handleSubmit(submitHandler)}
                                    className={classes.form}
                                >
                                    <List>
                                        <ListItem>
                                            <Controller
                                                name="name"
                                                control={control}
                                                defaultValue=""
                                                rules={{
                                                    required: true,
                                                }}
                                                render={({ field }) => (
                                                    <TextField
                                                        variant="outlined"
                                                        fullWidth
                                                        id="name"
                                                        label="Titre"
                                                        error={Boolean(errors.name)}
                                                        helperText={errors.name ? 'The title is a required field' : ''}
                                                        {...field}
                                                    ></TextField>
                                                )}
                                            ></Controller>
                                        </ListItem>
                                        <ListItem>
                                            <Controller
                                                name="slug"
                                                control={control}
                                                defaultValue=""
                                                rules={{
                                                    required: true,
                                                }}
                                                render={({ field }) => (
                                                    <TextField
                                                        variant="outlined"
                                                        fullWidth
                                                        id="slug"
                                                        label="Slug"
                                                        error={Boolean(errors.slug)}
                                                        helperText={errors.slug ? 'Slug is a required field' : ''}
                                                        {...field}
                                                    ></TextField>
                                                )}
                                            ></Controller>
                                        </ListItem>
                                        <ListItem>
                                            <Controller
                                                name="price"
                                                control={control}
                                                defaultValue=""
                                                rules={{
                                                    required: true,
                                                }}
                                                render={({ field }) => (
                                                    <TextField
                                                        variant="outlined"
                                                        fullWidth
                                                        id="price"
                                                        label="Price"
                                                        type="number"
                                                        error={Boolean(errors.price)}
                                                        helperText={errors.price ? 'Price is a required field' : ''}
                                                        {...field}
                                                    ></TextField>
                                                )}
                                            ></Controller>
                                        </ListItem>

                                        <ListItem>
                                            <Controller
                                                name="countInStock"
                                                control={control}
                                                defaultValue=""
                                                rules={{
                                                    required: true,
                                                }}
                                                render={({ field }) => (
                                                    <TextField
                                                        variant="outlined"
                                                        fullWidth
                                                        id="countInStock"
                                                        label="Quantité en stock"
                                                        type="number"
                                                        error={Boolean(errors.countInStock)}
                                                        helperText={errors.countInStock ? 'Quantity in stock' : ''}
                                                        {...field}

                                                    />
                                                )}
                                            ></Controller>
                                        </ListItem>

                                        <ListItem>
                                            <Controller
                                                name="description"
                                                control={control}
                                                defaultValue=""
                                                rules={{
                                                    required: true,
                                                }}
                                                render={({ field }) => (
                                                    <TextField
                                                        variant="outlined"
                                                        fullWidth
                                                        multiline
                                                        id="description"
                                                        label="Description"
                                                        error={Boolean(errors.description)}
                                                        helperText={
                                                            errors.description
                                                                ? 'Description is a required field'
                                                                : ''
                                                        }
                                                        {...field}
                                                    ></TextField>
                                                )}
                                            ></Controller>
                                        </ListItem>

                                        <ListItem>
                                            <Autocomplete
                                                freeSolo
                                                id="categories"
                                                options={categories}
                                                value={category}
                                                onChange={handleCategoryChange}
                                                fullWidth
                                                renderInput={(params) => (
                                                    <TextField
                                                        {...params}
                                                        label="Catégories"
                                                        onChange={(e) => setCategory(e.target.value)}
                                                    />
                                                )}
                                            />
                                        </ListItem>

                                        <ListItem>
                                            <Autocomplete
                                                freeSolo
                                                id="subCategories"
                                                options={subCategories}
                                                value={subCategory}
                                                onChange={handleSubCategoryChange}
                                                fullWidth
                                                renderInput={(params) => (
                                                    <TextField
                                                        {...params}
                                                        label="Sous Catégories"
                                                        onChange={(e) => setSubCategory(e.target.value)}
                                                    />
                                                )}
                                            />
                                        </ListItem>

                                        <ListItem >
                                            <FormControlLabel
                                                control={
                                                    <Checkbox
                                                        color="primary"
                                                        checked={isOffer}
                                                        onChange={(e) => setIsOffer(e.target.checked)}
                                                    />
                                                }
                                                label="bonnes affaires"
                                            />
                                        </ListItem>

                                        <Divider />

                                        <ListItem>
                                            <div className={styles.dropzone} {...getRootProps({ style })}>
                                                <input {...getInputProps()} />
                                                {isDragActive ? (
                                                    <p>Drop the images here ...</p>
                                                ) : (
                                                    <p>Drag and drop images here, or click to select images</p>
                                                )}
                                            </div>
                                        </ListItem>

                                        <ListItem>
                                            <div className={styles.images}>
                                                {selectedImages.length > 0 &&
                                                    selectedImages.map((image, index) => (
                                                        <div key={index}>
                                                            {image instanceof Blob ? (
                                                                <img
                                                                    src={URL.createObjectURL(image)}
                                                                    alt={`Product Image ${index}`}
                                                                    width={80}
                                                                    height={80}
                                                                />
                                                            ) : (
                                                                <img
                                                                    src={image.image}
                                                                    alt={`Product Image ${index}`}
                                                                    width={80}
                                                                    height={80}
                                                                />
                                                            )}
                                                            <IconButton
                                                                className={styles.deletePreview}
                                                                onClick={() => handleImageDelete(index)}
                                                            >
                                                                <IoIosCloseCircle />
                                                            </IconButton>
                                                            <Radio
                                                                className={styles.radioContainer}
                                                                id={`principal${index}`}
                                                                name="principalImage"
                                                                value={index}
                                                                checked={principalIndex === index}
                                                                onChange={() => handlePrincipalChange(index)}
                                                                disabled={isButtonDisabled === true}
                                                            />
                                                        </div>
                                                    ))}
                                            </div>
                                        </ListItem>
                                        <Box sx={{ marginBottom: 2 }}>
                                            <ListItem >
                                                <Button
                                                    variant="contained"
                                                    color="primary"
                                                    type='button' onClick={uploadImages}>
                                                        Upload to Cloudinary
                                                </Button>
                                            </ListItem>
                                        </Box>
                                        <ListItem>
                                            <Button
                                                variant="contained"
                                                type="submit"
                                                fullWidth
                                                color="primary"
                                                // disabled={selectedImages.length === 0 || imagesWithPrincipal.length !== selectedImages.length}
                                                disabled={isButtonDisabled === true}
                                            >
                                                Create
                                            </Button>
                                            {loadingUpdate && <CircularProgress />}
                                        </ListItem>
                                    </List>
                                </form>
                            </ListItem>
                        </List>
                    </Card>
                </Grid>
            </Grid>
        </Layout >
    );
}

export async function getServerSideProps() {
    return {
        props: {},
    };
}

export default dynamic(() => Promise.resolve(ProductCreate), { ssr: false });
